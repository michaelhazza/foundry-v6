import { db } from '../db';
import { users, organizations, type User } from '../db/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors';
import { createInvitation } from './invitation.service';

export interface UserListItem {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastActiveAt: Date | null;
  createdAt: Date;
}

export interface PaginatedUsers {
  data: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List users in organization with pagination
 */
export async function listUsers(
  organizationId: number,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedUsers> {
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: userList,
    pagination: {
      page,
      limit,
      total: totalResult.count,
      totalPages: Math.ceil(totalResult.count / limit),
    },
  };
}

/**
 * Get user by ID with organization validation
 */
export async function getUserById(
  userId: number,
  organizationId: number
): Promise<UserListItem | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  return user || null;
}

/**
 * Invite a new user to the organization
 */
export async function inviteUser(
  email: string,
  role: string,
  organizationId: number,
  invitedById: number
): Promise<{ sent: boolean; devUrl?: string }> {
  return createInvitation(email, role, organizationId, invitedById);
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: number,
  organizationId: number,
  newRole: string,
  currentUserId: number
): Promise<UserListItem> {
  // Can't change your own role
  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot change your own role');
  }

  const user = await getUserById(userId, organizationId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if this is the last admin (for admin -> member downgrade)
  if (user.role === 'admin' && newRole === 'member') {
    const [adminCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'admin'),
        eq(users.isActive, true)
      ));

    if (adminCount.count <= 1) {
      throw new ForbiddenError('Cannot demote the last admin');
    }
  }

  await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ...user, role: newRole };
}

/**
 * Deactivate user
 */
export async function deactivateUser(
  userId: number,
  organizationId: number,
  currentUserId: number
): Promise<UserListItem> {
  // Can't deactivate yourself
  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot deactivate your own account');
  }

  const user = await getUserById(userId, organizationId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if this is the last admin
  if (user.role === 'admin') {
    const [adminCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'admin'),
        eq(users.isActive, true)
      ));

    if (adminCount.count <= 1) {
      throw new ForbiddenError('Cannot deactivate the last admin');
    }
  }

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ...user, isActive: false };
}

/**
 * Reactivate user
 */
export async function reactivateUser(
  userId: number,
  organizationId: number
): Promise<UserListItem> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ...user, isActive: true };
}
