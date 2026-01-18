import { db } from '../db';
import { connections, type Connection } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../errors';
import { encrypt, decrypt } from '../lib/encryption';

export interface ConnectionListItem {
  id: number;
  name: string;
  type: string;
  isValid: boolean;
  lastTestedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
}

export interface ConnectionDetails extends ConnectionListItem {
  credentials?: {
    subdomain?: string;
  };
}

export interface TeamworkCredentials {
  apiKey: string;
  subdomain: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * List connections for an organization with pagination
 */
export async function listConnections(
  organizationId: number,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<ConnectionListItem>> {
  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(connections)
    .where(eq(connections.organizationId, organizationId));

  const total = totalResult.count;
  const offset = (page - 1) * limit;

  const data = await db
    .select({
      id: connections.id,
      name: connections.name,
      type: connections.type,
      isValid: connections.isValid,
      lastTestedAt: connections.lastTestedAt,
      lastSyncAt: connections.lastSyncAt,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(eq(connections.organizationId, organizationId))
    .orderBy(desc(connections.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data,
    pagination: { page, limit, total },
  };
}

/**
 * Get connection by ID
 */
export async function getConnectionById(
  connectionId: number,
  organizationId: number
): Promise<ConnectionDetails | null> {
  const [connection] = await db
    .select()
    .from(connections)
    .where(and(
      eq(connections.id, connectionId),
      eq(connections.organizationId, organizationId)
    ))
    .limit(1);

  if (!connection) {
    return null;
  }

  // Decrypt credentials to get non-sensitive parts
  let credentials: { subdomain?: string } | undefined;
  try {
    const decrypted = JSON.parse(decrypt(connection.encryptedCredentials));
    credentials = { subdomain: decrypted.subdomain };
  } catch {
    // If decryption fails, just don't include credentials
  }

  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    isValid: connection.isValid,
    lastTestedAt: connection.lastTestedAt,
    lastSyncAt: connection.lastSyncAt,
    createdAt: connection.createdAt,
    credentials,
  };
}

/**
 * Create a new connection
 */
export async function createConnection(
  organizationId: number,
  name: string,
  type: string,
  credentials: TeamworkCredentials
): Promise<ConnectionDetails> {
  const encryptedCredentials = encrypt(JSON.stringify(credentials));

  const [connection] = await db
    .insert(connections)
    .values({
      organizationId,
      name,
      type,
      encryptedCredentials,
      isValid: false, // Will be updated after test
    })
    .returning();

  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    isValid: connection.isValid,
    lastTestedAt: connection.lastTestedAt,
    lastSyncAt: connection.lastSyncAt,
    createdAt: connection.createdAt,
    credentials: { subdomain: credentials.subdomain },
  };
}

/**
 * Update connection
 */
export async function updateConnection(
  connectionId: number,
  organizationId: number,
  data: { name?: string; credentials?: TeamworkCredentials }
): Promise<ConnectionDetails> {
  const existing = await getConnectionById(connectionId, organizationId);

  if (!existing) {
    throw new NotFoundError('Connection not found');
  }

  const updateData: Partial<Connection> = {
    updatedAt: new Date(),
  };

  if (data.name) {
    updateData.name = data.name;
  }

  if (data.credentials) {
    updateData.encryptedCredentials = encrypt(JSON.stringify(data.credentials));
    updateData.isValid = false; // Need to re-test after credential change
  }

  await db
    .update(connections)
    .set(updateData)
    .where(eq(connections.id, connectionId));

  return (await getConnectionById(connectionId, organizationId))!;
}

/**
 * Delete connection
 */
export async function deleteConnection(
  connectionId: number,
  organizationId: number
): Promise<void> {
  const existing = await getConnectionById(connectionId, organizationId);

  if (!existing) {
    throw new NotFoundError('Connection not found');
  }

  await db.delete(connections).where(eq(connections.id, connectionId));
}

/**
 * Test connection credentials
 */
export async function testConnection(
  connectionId: number,
  organizationId: number
): Promise<{ success: boolean; message: string }> {
  const [connection] = await db
    .select()
    .from(connections)
    .where(and(
      eq(connections.id, connectionId),
      eq(connections.organizationId, organizationId)
    ))
    .limit(1);

  if (!connection) {
    throw new NotFoundError('Connection not found');
  }

  let credentials: TeamworkCredentials;
  try {
    credentials = JSON.parse(decrypt(connection.encryptedCredentials));
  } catch {
    throw new BadRequestError('Failed to decrypt connection credentials');
  }

  // Test the connection based on type
  if (connection.type === 'teamwork_desk') {
    try {
      // Make a test API call to Teamwork Desk
      const response = await fetch(
        `https://${credentials.subdomain}.teamwork.com/desk/v1/me.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:x`).toString('base64')}`,
          },
        }
      );

      if (response.ok) {
        // Update connection as valid
        await db
          .update(connections)
          .set({
            isValid: true,
            lastTestedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(connections.id, connectionId));

        return { success: true, message: 'Connection successful' };
      } else {
        // Update connection as invalid
        await db
          .update(connections)
          .set({
            isValid: false,
            lastTestedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(connections.id, connectionId));

        return { success: false, message: `API returned status ${response.status}` };
      }
    } catch (error) {
      // Update connection as invalid
      await db
        .update(connections)
        .set({
          isValid: false,
          lastTestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connections.id, connectionId));

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  return { success: false, message: 'Unknown connection type' };
}

/**
 * Get decrypted credentials for a connection (internal use only)
 */
export async function getConnectionCredentials(
  connectionId: number,
  organizationId: number
): Promise<TeamworkCredentials | null> {
  const [connection] = await db
    .select({ encryptedCredentials: connections.encryptedCredentials })
    .from(connections)
    .where(and(
      eq(connections.id, connectionId),
      eq(connections.organizationId, organizationId)
    ))
    .limit(1);

  if (!connection) {
    return null;
  }

  try {
    return JSON.parse(decrypt(connection.encryptedCredentials));
  } catch {
    return null;
  }
}
