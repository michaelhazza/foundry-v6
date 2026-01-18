import crypto from 'crypto';
import { db } from '../db';
import {
  invitations,
  users,
  organizations,
  type Invitation,
} from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { BadRequestError, NotFoundError, ConflictError } from '../errors';
import { hashPassword } from './auth.service';
import { sendInvitationEmail } from './email.service';

const INVITATION_EXPIRES_DAYS = 7;

export interface InvitationDetails {
  id: number;
  email: string;
  role: string;
  organizationName: string;
  inviterName: string | null;
  expiresAt: Date;
}

/**
 * Create an invitation and send email
 */
export async function createInvitation(
  email: string,
  role: string,
  organizationId: number,
  invitedById: number
): Promise<{ sent: boolean; devUrl?: string }> {
  // Check if user already exists in this organization
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.email, email.toLowerCase()),
      eq(users.organizationId, organizationId)
    ))
    .limit(1);

  if (existingUser) {
    throw new ConflictError('User already exists in this organization');
  }

  // Check for pending invitation
  const [pendingInvitation] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(
      eq(invitations.email, email.toLowerCase()),
      eq(invitations.organizationId, organizationId),
      isNull(invitations.acceptedAt)
    ))
    .limit(1);

  if (pendingInvitation) {
    throw new ConflictError('An invitation has already been sent to this email');
  }

  // Get organization and inviter details for the email
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, invitedById))
    .limit(1);

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  // Create invitation
  await db.insert(invitations).values({
    organizationId,
    email: email.toLowerCase(),
    role,
    token,
    invitedById,
    expiresAt,
  });

  // Send email
  const result = await sendInvitationEmail(
    email,
    org?.name || 'Unknown Organization',
    inviter?.name || 'A team administrator',
    token
  );

  return {
    sent: result.sent,
    devUrl: result.devFallback?.url,
  };
}

/**
 * Get invitation details by token
 */
export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const [invitation] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      organizationId: invitations.organizationId,
      invitedById: invitations.invitedById,
    })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) {
    return null;
  }

  // Get organization name
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, invitation.organizationId))
    .limit(1);

  // Get inviter name
  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, invitation.invitedById))
    .limit(1);

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationName: org?.name || 'Unknown Organization',
    inviterName: inviter?.name || null,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Validate invitation token
 */
export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation?: InvitationDetails;
  error?: string;
}> {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: 'Invitation not found' };
  }

  // Get full invitation to check acceptedAt
  const [fullInvitation] = await db
    .select({ acceptedAt: invitations.acceptedAt })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (fullInvitation?.acceptedAt) {
    return { valid: false, error: 'Invitation has already been accepted' };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: 'Invitation has expired' };
  }

  return { valid: true, invitation };
}

/**
 * Accept invitation and create user
 */
export async function acceptInvitation(
  token: string,
  name: string,
  password: string
): Promise<{ userId: number }> {
  const validation = await validateInvitation(token);

  if (!validation.valid) {
    throw new BadRequestError(validation.error || 'Invalid invitation');
  }

  const invitation = validation.invitation!;

  // Get organization ID from invitation
  const [invitationRecord] = await db
    .select({ organizationId: invitations.organizationId })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitationRecord) {
    throw new NotFoundError('Invitation not found');
  }

  const passwordHash = await hashPassword(password);

  // Create user and mark invitation as accepted
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        organizationId: invitationRecord.organizationId,
        email: invitation.email.toLowerCase(),
        passwordHash,
        name,
        role: invitation.role,
        isActive: true,
      })
      .returning({ id: users.id });

    await tx
      .update(invitations)
      .set({ acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(invitations.token, token));

    return user;
  });

  return { userId: result.id };
}
