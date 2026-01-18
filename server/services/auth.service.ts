import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import {
  users,
  organizations,
  passwordResetTokens,
  type User,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '../config/env';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../errors';
import { sendPasswordResetEmail } from './email.service';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_HOURS = 1;

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  organizationId: number;
  organizationName: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

/**
 * Authenticate user with email and password
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  // Find user with organization
  const [result] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      role: users.role,
      organizationId: users.organizationId,
      isActive: users.isActive,
      organizationName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!result) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!result.isActive) {
    throw new UnauthorizedError('Account has been deactivated');
  }

  const isValidPassword = await bcrypt.compare(password, result.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last active timestamp
  await db
    .update(users)
    .set({ lastActiveAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, result.id));

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: result.id,
      organizationId: result.organizationId,
      role: result.role,
    },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      organizationId: result.organizationId,
      organizationName: result.organizationName,
    },
  };
}

/**
 * Get user by ID with organization info
 */
export async function getUserById(userId: number): Promise<AuthUser | null> {
  const [result] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      organizationId: users.organizationId,
      isActive: users.isActive,
      organizationName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
    organizationId: result.organizationId,
    organizationName: result.organizationName,
  };
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<{ sent: boolean; devUrl?: string }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Always return success to prevent email enumeration
  if (!user) {
    return { sent: true };
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  // Store token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // Send email
  const result = await sendPasswordResetEmail(email, token);

  return {
    sent: result.sent,
    devUrl: result.devFallback?.url,
  };
}

/**
 * Validate password reset token
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const [resetToken] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (!resetToken) {
    return { valid: false };
  }

  if (resetToken.usedAt) {
    return { valid: false };
  }

  if (resetToken.expiresAt < new Date()) {
    return { valid: false };
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, resetToken.userId))
    .limit(1);

  return { valid: true, email: user?.email };
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const [resetToken] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (!resetToken) {
    throw new BadRequestError('Invalid password reset token');
  }

  if (resetToken.usedAt) {
    throw new BadRequestError('Password reset token has already been used');
  }

  if (resetToken.expiresAt < new Date()) {
    throw new BadRequestError('Password reset token has expired');
  }

  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));
  });
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new BadRequestError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
