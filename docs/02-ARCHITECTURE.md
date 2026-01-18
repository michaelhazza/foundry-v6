# Foundry — Technical Architecture Document

**Version:** 1.0  
**Date:** January 2026  
**Status:** COMPLETE  
**Source PRD:** 01-PRD.md v1.0  
**Deployment Target:** Replit

---

## Section 1: Architectural Overview

### High-Level Architecture

Foundry follows a **monolithic full-stack architecture** deployed as a single container on Replit. This pattern was selected for:

1. **Deployment Simplicity:** Replit's single-container model makes microservices impractical
2. **Development Velocity:** Single codebase reduces coordination overhead for MVP
3. **Operational Simplicity:** One deployment artifact, one log stream, one process to monitor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Replit Container                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Express.js Server                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────────┐ │ │
│  │  │   Auth       │  │   API        │  │   Static File Server          │ │ │
│  │  │   Middleware │  │   Routes     │  │   (Production: dist/public)   │ │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────────────────┘ │ │
│  │                              │                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────────┐ │ │
│  │  │   Service    │  │   PII        │  │   File Processing             │ │ │
│  │  │   Layer      │  │   Detection  │  │   Engine                      │ │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Drizzle ORM (postgres-js driver)                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │   PostgreSQL (Neon)      │
                        │   External Database      │
                        └──────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │   External Services      │
                        │   - Teamwork Desk API    │
                        │   - Email (SendGrid)     │
                        └──────────────────────────┘
```

### Core Architectural Pattern

**Layered Monolith with Service Separation:**

| Layer | Responsibility | Components |
|-------|----------------|------------|
| Presentation | HTTP handling, request validation, response formatting | Express routes, Zod schemas, error handlers |
| Service | Business logic, orchestration, transaction management | Auth service, Project service, Processing service, PII service |
| Data Access | Database queries, ORM mapping | Drizzle ORM, Repository pattern |
| Infrastructure | Cross-cutting concerns | Logging, rate limiting, security headers |

### System Boundaries

**Internal Boundaries:**
- Frontend (React SPA) ↔ Backend (Express API) via `/api` routes
- Service layer ↔ Database via Drizzle ORM
- Processing engine ↔ File storage via local filesystem (ephemeral, processed to DB)

**External Boundaries:**
- Backend ↔ Neon PostgreSQL (DATABASE_URL)
- Backend ↔ Teamwork Desk API (REST, API key auth)
- Backend ↔ Email service (SendGrid API)

### Key Architectural Drivers

1. **Replit Deployment Constraints:** Single container, Port 5000, ephemeral filesystem, cold starts
2. **Multi-Tenancy Requirement:** Strict data isolation between organizations (row-level security)
3. **PII Processing Performance:** 1,000 records/minute target throughput
4. **5-Minute Time-to-Value:** Optimized for rapid onboarding flow
5. **MVP Budget Constraints:** Favor free/low-cost services, minimize infrastructure complexity

---

## Section 2: Technology Stack

### Frontend

| Technology | Version | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| React | 18.x | Industry standard, large ecosystem, team familiarity assumed | Vue.js (smaller ecosystem), Svelte (less mature tooling) |
| Vite | 5.x | Fast HMR, native ESM, excellent Replit compatibility | Create React App (deprecated), Webpack (slower builds) |
| TypeScript | 5.x | Type safety, better IDE support, catches errors at compile time | JavaScript (no type safety) |
| Tailwind CSS | 4.x | Utility-first, consistent styling, rapid UI development | CSS Modules (more boilerplate), Styled Components (runtime overhead) |
| shadcn/ui | Latest | High-quality accessible components, Tailwind integration | Material UI (heavier), Chakra (different styling paradigm) |
| React Query | 5.x | Server state management, caching, automatic refetching | SWR (less features), Redux (overkill for server state) |
| React Router | 6.x | Standard routing solution, nested routes support | Wouter (minimal features) |
| Zod | 3.x | Runtime validation, TypeScript inference, schema sharing with backend | Yup (less TypeScript support), Joi (Node.js focused) |

### Backend

| Technology | Version | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| Node.js | 20.x | Replit native support, JavaScript ecosystem, async I/O | Python (different expertise), Go (smaller ecosystem) |
| Express.js | 4.x | Mature, minimal, extensive middleware ecosystem | Fastify (less mature ecosystem), Koa (smaller community) |
| TypeScript | 5.x | Shared types with frontend, compile-time safety | JavaScript (no type safety) |
| Drizzle ORM | 0.30.x | Type-safe queries, lightweight, PostgreSQL native | Prisma (heavier, introspection issues), Knex (less type safety) |
| postgres (postgres-js) | 3.x | **CRITICAL:** Replit-compatible driver (NOT @neondatabase/serverless) | pg (less modern API), @neondatabase/serverless (fetch failed errors in Replit) |
| bcrypt | 5.x | Industry-standard password hashing | argon2 (less widespread support) |
| jsonwebtoken | 9.x | JWT generation/verification, standard implementation | jose (more complex API) |
| Zod | 3.x | Request validation, shared schemas with frontend | express-validator (less TypeScript integration) |
| helmet | 7.x | Security headers middleware | Manual headers (error-prone) |
| cors | 2.x | CORS handling | Manual implementation (error-prone) |
| express-rate-limit | 7.x | Rate limiting protection | Custom implementation (time-consuming) |
| morgan | 1.x | HTTP request logging | Custom logging (less standard) |
| multer | 1.x | File upload handling | formidable (less popular), busboy (lower-level) |
| xlsx | 0.20.x | Excel file parsing | exceljs (heavier), node-xlsx (less features) |
| csv-parse | 5.x | CSV parsing with streaming support | papaparse (browser-focused), fast-csv (less maintained) |

### PII Detection

| Technology | Version | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| compromise | 14.x | Lightweight NER for JavaScript, no external dependencies | spaCy (Python, requires separate service), Stanford NER (Java, heavy) |
| Custom regex patterns | N/A | Email, phone, address detection where NER insufficient | External NER service (latency, cost) |

**ADR Reference:** See ADR-005 for NER library selection rationale.

### Infrastructure

| Technology | Provider | Rationale | Alternatives Considered |
|------------|----------|-----------|------------------------|
| Container Runtime | Replit | Primary deployment target per PRD | Heroku (cost), Railway (less mature) |
| Database | Neon (PostgreSQL) | Serverless PostgreSQL, generous free tier, Replit integration | Supabase (more opinionated), PlanetScale (MySQL) |
| Email | SendGrid | Reliable delivery, free tier sufficient for MVP | Postmark (paid only), Amazon SES (more setup) |
| File Storage | Ephemeral + Database | Files processed and stored as database records; raw files are temporary | S3 (cost, complexity), Cloudinary (not needed) |

### Replit Compatibility Verification

| Component | Replit Compatible | Notes |
|-----------|-------------------|-------|
| Node.js 20 | ✅ | Native support via nix |
| Express on Port 5000 | ✅ | Required port |
| Vite dev server | ✅ | Requires `host: '0.0.0.0'` |
| Drizzle + postgres-js | ✅ | Must NOT use @neondatabase/serverless |
| Neon PostgreSQL | ✅ | External database via DATABASE_URL |
| File uploads | ✅ | Ephemeral filesystem, process immediately |
| Background processing | ⚠️ | Single process, use async/await patterns |
| Cold starts | ✅ | Architecture tolerates sleep/wake cycle |

---

## Section 3: PRD-to-Architecture Traceability

| PRD Feature | Architectural Support | Components Involved |
|-------------|----------------------|---------------------|
| F-001: User Authentication | JWT-based auth, bcrypt hashing, session management | AuthService, AuthMiddleware, User table |
| F-002: Organization Multi-tenancy | Row-level security, org_id on all queries | All services enforce org scope, RLS policies |
| F-003: Project Management | CRUD services, soft delete | ProjectService, Project table |
| F-004: File Upload | Multer middleware, file parsing engines | FileUploadMiddleware, FileParserService |
| F-005: Column Detection & Mapping | Schema inference, pattern matching | ColumnDetectionService, MappingService |
| F-006: De-identification Engine | NER + regex hybrid, placeholder management | PIIDetectionService, PlaceholderManager |
| F-007: De-identification Preview | Sample processing, diff generation | PreviewService (uses PIIDetectionService) |
| F-008: Quality Filtering | Filter chain pattern, statistics tracking | FilterService, FilterStatisticsCollector |
| F-009: Batch Processing Engine | Async processing, progress tracking | ProcessingService, ProcessingRunManager |
| F-010: JSONL Export | Stream generation, compression | ExportService, StreamingJSONLWriter |
| F-011: Teamwork Desk Connector | REST client, credential encryption | TeamworkDeskClient, ConnectionService |
| F-012: Platform Administration | Admin-only routes, org management | PlatformAdminService, AdminRoutes |

---

## Section 4: Component Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ AuthRoutes  │ │ OrgRoutes   │ │ProjectRoutes│ │ ProcessingRoutes        ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │SourceRoutes│ │MappingRoutes│ │ ExportRoutes│ │ ConnectionRoutes        ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        PlatformAdminRoutes                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Service Layer                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ AuthService │ │ UserService │ │  OrgService │ │ ProjectService          ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │SourceService│ │MappingService│ │FilterService│ │ PIIDetectionService    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ProcessingService│ │ExportService│ │ConnectionService│ │TeamworkDeskClient││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      PlatformAdminService                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Access Layer                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Drizzle ORM (Core Select API)                        ││
│  │  db.select().from(table).where(condition)                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibility Matrix

| Component | Responsibility | Dependencies | Exposes |
|-----------|---------------|--------------|---------|
| AuthService | Login, logout, password reset, JWT management | UserService, bcrypt, jwt | authenticate(), resetPassword(), validateToken() |
| UserService | User CRUD, invitation management | OrgService, EmailService | createUser(), inviteUser(), deactivateUser() |
| OrgService | Organization CRUD, membership validation | - | createOrg(), getOrg(), validateMembership() |
| ProjectService | Project CRUD, status management | OrgService | createProject(), updateProject(), deleteProject() |
| SourceService | File upload, API source configuration | ProjectService, FileParserService | createFileSource(), createAPISource() |
| MappingService | Column detection, field mapping management | SourceService | detectColumns(), saveMappings() |
| FilterService | Quality filter configuration and execution | ProjectService | applyFilters(), getFilterStats() |
| PIIDetectionService | PII detection and anonymization | PlaceholderManager, compromise | detectPII(), anonymize() |
| ProcessingService | Batch processing orchestration | SourceService, PIIDetectionService, FilterService | startProcessing(), getProgress(), cancelProcessing() |
| ExportService | JSONL generation, compression | ProcessingService | generateExport(), downloadOutput() |
| ConnectionService | API connection CRUD, credential management | EncryptionService | createConnection(), testConnection() |
| TeamworkDeskClient | Teamwork Desk API integration | ConnectionService | fetchTickets(), testCredentials() |
| PlatformAdminService | Org creation, platform monitoring | OrgService, UserService | createOrganization(), listOrganizations() |

### Key Interfaces

```typescript
// Service method signatures (not full implementation)

interface AuthService {
  login(email: string, password: string): Promise<{ token: string; user: User }>;
  logout(userId: number): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  validateToken(token: string): Promise<TokenPayload>;
}

interface ProcessingService {
  startProcessing(projectId: number, orgId: number): Promise<ProcessingRun>;
  getProgress(runId: number): Promise<ProcessingProgress>;
  cancelProcessing(runId: number): Promise<void>;
}

interface PIIDetectionService {
  detectPII(text: string): Promise<PIIDetectionResult[]>;
  anonymize(text: string, detections: PIIDetectionResult[]): Promise<string>;
}
```

---

## Section 5: Authentication and Authorization

### Authentication Flow

#### Registration (via Invitation Only)

```
1. Platform Admin creates organization with initial admin email
   └─> System generates invitation token (24-hour expiry)
   └─> Email sent with invitation link

2. User clicks invitation link
   └─> GET /api/auth/invitation/:token
   └─> Validate token (not expired, not used)
   └─> Return invitation details (org name, email)

3. User submits password
   └─> POST /api/auth/accept-invitation
   └─> Hash password (bcrypt, cost factor 12)
   └─> Create user record
   └─> Mark invitation as used
   └─> Generate JWT
   └─> Return token + user details
```

#### Login

```
1. User submits credentials
   └─> POST /api/auth/login
   └─> Validate email format (Zod)
   └─> Look up user by email
   └─> Check user status (active, not deactivated)
   └─> Compare password hash (bcrypt.compare)
   └─> Generate JWT (7-day expiry, sliding)
   └─> Update lastLoginAt
   └─> Return token + user details

2. Client stores token
   └─> localStorage.setItem('token', token)

3. Subsequent requests
   └─> Authorization: Bearer <token>
   └─> Middleware validates + refreshes if near expiry
```

#### Token Management

| Aspect | Implementation |
|--------|----------------|
| Token Type | JWT (HS256) |
| Expiry | 7 days (sliding - refreshed on activity) |
| Storage | Client: localStorage |
| Refresh | Automatic on requests if <1 day remaining |
| Invalidation | Not tracked server-side (stateless); rely on expiry |
| Payload | `{ userId, orgId, role, platformRole, exp, iat }` |

#### Logout

```
1. Client calls logout
   └─> POST /api/auth/logout (optional, for audit)
   └─> Clear localStorage token
   └─> Redirect to /login
```

#### Password Reset

```
1. User requests reset
   └─> POST /api/auth/forgot-password { email }
   └─> Generate reset token (crypto.randomUUID)
   └─> Store hash with 24-hour expiry
   └─> Send email with reset link

2. User clicks reset link
   └─> GET /api/auth/reset-password/:token
   └─> Validate token (not expired)
   └─> Return { valid: true }

3. User submits new password
   └─> POST /api/auth/reset-password
   └─> Validate token again
   └─> Hash new password
   └─> Update user record
   └─> Invalidate reset token
   └─> Return success (user must login with new password)
```

### Authorization (RBAC)

#### Role Hierarchy

```
Platform Admin (Foundry Staff)
    │
    ├─> Can create organizations
    ├─> Can view all organizations (metadata only)
    ├─> Can view platform health
    └─> Cannot access organization data content

Organization Admin
    │
    ├─> All Member permissions
    ├─> Can invite users to organization
    ├─> Can manage user roles
    ├─> Can deactivate users
    ├─> Can manage API connections
    └─> Cannot create organizations

Organization Member
    │
    ├─> Can create/edit/delete projects
    ├─> Can upload files
    ├─> Can configure processing
    ├─> Can trigger processing
    ├─> Can download outputs
    └─> Cannot manage users or connections
```

#### Permission Matrix

| Action | Member | Admin | Platform Admin |
|--------|--------|-------|----------------|
| View own projects | ✅ | ✅ | ❌ |
| Create projects | ✅ | ✅ | ❌ |
| Upload files | ✅ | ✅ | ❌ |
| Configure processing | ✅ | ✅ | ❌ |
| Trigger processing | ✅ | ✅ | ❌ |
| Download outputs | ✅ | ✅ | ❌ |
| View org users | ❌ | ✅ | ❌ |
| Invite users | ❌ | ✅ | ❌ |
| Manage user roles | ❌ | ✅ | ❌ |
| Deactivate users | ❌ | ✅ | ❌ |
| Manage connections | ❌ | ✅ | ❌ |
| Create organizations | ❌ | ❌ | ✅ |
| View all organizations | ❌ | ❌ | ✅ |
| View platform health | ❌ | ❌ | ✅ |

#### Middleware Implementation

```typescript
// Authentication Middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = payload;
    
    // Sliding expiry: refresh if <1 day remaining
    if (payload.exp - Date.now() / 1000 < 86400) {
      const newToken = generateToken(payload);
      res.setHeader('X-Refreshed-Token', newToken);
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
};

// Role Authorization Middleware
export const requireRole = (roles: ('admin' | 'member')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
};

// Platform Admin Middleware
export const requirePlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.platformRole !== 'platform_admin') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Platform admin access required' } });
  }
  next();
};

// Organization Scope Middleware (prevents cross-tenant access)
export const requireOrgScope = (req: Request, res: Response, next: NextFunction) => {
  const orgIdFromParams = parseInt(req.params.orgId, 10);
  if (orgIdFromParams && orgIdFromParams !== req.user!.orgId) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }
  next();
};
```

---

## Section 6: Security Architecture (MVP)

### Security Middleware Stack

```typescript
// server/index.ts - Middleware registration order

// 1. Request logging (first, captures all requests)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Relaxed for MVP; tighten post-launch
  crossOriginEmbedderPolicy: false,
}));

// 3. CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.APP_URL 
    : true,
  credentials: true,
}));

// 4. Rate limiting (global)
app.use(globalLimiter);

// 5. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### Rate Limiting Strategy

| Endpoint Category | Window | Max Requests | Rationale |
|-------------------|--------|--------------|-----------|
| Global (all routes) | 15 min | 100 | General abuse prevention |
| Auth (/api/auth/*) | 15 min | 10 | Brute-force protection |
| Password reset | 1 hour | 3 | Prevent email spam |
| File upload | 1 hour | 20 | Resource protection |
| Processing trigger | 1 hour | 10 | Prevent processing abuse |

```typescript
// Rate limit configurations
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Upload limit reached, please try again later' } },
});
```

### Input Validation Approach

All inputs validated using Zod schemas at route level:

```typescript
// Example: Login validation
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
          },
        });
      }
      next(error);
    }
  };
};
```

### Error Handling Pattern

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'BAD_REQUEST', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    super(404, 'NOT_FOUND', id ? `${resource} with ID ${id} not found` : `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMITED', message);
  }
}

// Global error handler
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Unexpected errors
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};
```

### Credential Encryption

API credentials (e.g., Teamwork Desk API keys) encrypted at rest:

```typescript
// server/lib/encryption.ts
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(env.ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(env.ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Password Requirements

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum length | 8 characters | NIST 800-63B minimum |
| Hashing algorithm | bcrypt | Industry standard |
| Cost factor | 12 | Balance security/performance |
| Max length | 72 characters | bcrypt limitation |

---

## Section 7: Data Architecture Overview

### Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   File Upload    │────▶│   Parse & Store  │────▶│   Temp Storage   │
│   (CSV/Excel/    │     │   Raw Records    │     │   (ephemeral)    │
│    JSON)         │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                         ┌──────────────────┐             │
                         │   API Fetch      │─────────────┤
                         │   (Teamwork)     │             │
                         └──────────────────┘             ▼
                                              ┌──────────────────┐
                                              │   Column         │
                                              │   Detection      │
                                              └──────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │   Field Mapping  │
                                              │   Configuration  │
                                              └──────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │   Quality        │
                                              │   Filtering      │
                                              └──────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │   PII Detection  │
                                              │   & Anonymization│
                                              └──────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │   Processed      │
                                              │   Output (DB)    │
                                              └──────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │   JSONL Export   │
                                              │   Download       │
                                              └──────────────────┘
```

### Storage Strategy

| Data Type | Storage Location | Retention | Rationale |
|-----------|-----------------|-----------|-----------|
| User accounts | PostgreSQL | Indefinite | Core data |
| Organizations | PostgreSQL | Indefinite | Core data |
| Projects | PostgreSQL | Indefinite (soft delete 30 days) | User data |
| Raw uploaded files | Ephemeral filesystem | Until processed | Replit constraint |
| Parsed source records | PostgreSQL | 30 days | Temp processing data |
| Field mappings | PostgreSQL | With project | Configuration |
| Processing configuration | PostgreSQL | With project | Configuration |
| Processing runs | PostgreSQL | Indefinite | Audit trail |
| Processed output records | PostgreSQL | Until deleted | User data |
| API credentials | PostgreSQL (encrypted) | With connection | Sensitive data |

### Caching Strategy

**MVP: Minimal caching to reduce complexity**

| Cache Type | Implementation | TTL | Use Case |
|------------|---------------|-----|----------|
| Token validation | In-memory (Map) | 5 min | Reduce JWT verification |
| User lookup | React Query (client) | 5 min | Reduce API calls |
| Project list | React Query (client) | 1 min | UI responsiveness |

**Note:** Server-side Redis caching deferred to post-MVP to avoid infrastructure complexity.

---

## Section 8: Third-Party Integrations

### Integration 1: Teamwork Desk API

| Aspect | Details |
|--------|---------|
| Classification | **REQUIRED** (per PRD) |
| API Type | REST |
| Base URL | `https://{subdomain}.teamwork.com/desk/v1` |
| Authentication | API Key (header: `X-Desk-API-Key`) |
| Rate Limits | 50 requests/second (documented) |
| Cost | Free (included with Teamwork Desk subscription) |
| Failure Modes | 401 (invalid key), 404 (subdomain not found), 429 (rate limited), 5xx (service unavailable) |
| Fallback | Graceful degradation - show error, allow retry; processing continues with available data |

**Implementation Pattern:**

```typescript
// server/lib/teamwork-desk-client.ts
export class TeamworkDeskClient {
  constructor(
    private subdomain: string,
    private apiKey: string
  ) {}

  async testConnection(): Promise<{ success: boolean; ticketCount?: number; error?: string }> {
    try {
      const response = await fetch(`https://${this.subdomain}.teamwork.com/desk/v1/tickets.json?pageSize=1`, {
        headers: { 'X-Desk-API-Key': this.apiKey },
      });
      
      if (!response.ok) {
        if (response.status === 401) return { success: false, error: 'Invalid API key' };
        if (response.status === 404) return { success: false, error: 'Subdomain not found' };
        return { success: false, error: 'Connection failed' };
      }
      
      const data = await response.json();
      return { success: true, ticketCount: data.totalCount };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async fetchTickets(options: TicketFetchOptions): Promise<Ticket[]> {
    // Pagination, filtering, rate limit handling
  }
}
```

### Integration 2: Email Service (SendGrid)

| Aspect | Details |
|--------|---------|
| Classification | **OPTIONAL** (graceful degradation available) |
| API Type | REST |
| Authentication | API Key (header: `Authorization: Bearer`) |
| Rate Limits | 100 emails/day (free tier) |
| Cost | Free tier sufficient for MVP |
| Failure Modes | 401 (invalid key), 429 (rate limited), 5xx (service unavailable) |
| Fallback | Log email content to console; admin can manually send |

**Graceful Degradation Pattern:**

```typescript
// server/services/email-service.ts
export class EmailService {
  private client: SendGridClient | null;

  constructor() {
    if (env.SENDGRID_API_KEY) {
      this.client = new SendGridClient(env.SENDGRID_API_KEY);
    } else {
      console.warn('[EmailService] SENDGRID_API_KEY not configured - emails will be logged only');
      this.client = null;
    }
  }

  async sendInvitation(email: string, inviteLink: string, orgName: string): Promise<void> {
    const emailContent = {
      to: email,
      subject: `You've been invited to join ${orgName} on Foundry`,
      html: `<p>Click <a href="${inviteLink}">here</a> to accept your invitation.</p>`,
    };

    if (this.client) {
      await this.client.send(emailContent);
    } else {
      console.log('[EmailService] Would send email:', emailContent);
    }
  }
}
```

---

## Section 9: Replit Deployment Configuration

### .replit File

```toml
run = "npm run dev"
entrypoint = "server/index.ts"
modules = ["nodejs-20:v8-20230920-bd784b9"]

[nix]
channel = "stable-24_05"

[deployment]
build = "npm run build"
run = "npm run start"

[[ports]]
localPort = 5000
externalPort = 80
```

### replit.nix File

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.postgresql
  ];
}
```

### Environment Variables

#### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| DATABASE_URL | Neon PostgreSQL connection | `postgresql://user:pass@host/db?sslmode=require` |
| JWT_SECRET | JWT signing key (32+ chars) | `your-256-bit-secret-key-here` |
| ENCRYPTION_KEY | API credential encryption (32 bytes hex) | `64-character-hex-string` |

#### Optional Variables (Graceful Degradation)

| Variable | Purpose | Fallback Behavior |
|----------|---------|-------------------|
| SENDGRID_API_KEY | Email delivery | Emails logged to console |
| APP_URL | Production URL for CORS/emails | Defaults to `*` CORS |
| NODE_ENV | Environment detection | Defaults to `development` |

### Port Configuration

```typescript
// server/index.ts
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3001);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Vite Configuration (Development)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
});
```

### Database Migration Script

```typescript
// scripts/db-push.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete');
  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "db:push": "tsx scripts/db-push.ts",
    "db:generate": "drizzle-kit generate"
  }
}
```

---

## Section 10: Architecture Decision Records

### ADR-001: Monolithic Architecture over Microservices

**Context:** Foundry needs to deploy to Replit's single-container environment while supporting multi-tenant data processing with PII detection.

**Decision:** Implement a layered monolithic architecture with clear service boundaries.

**Consequences:**
- ✅ Single deployment artifact simplifies Replit deployment
- ✅ No inter-service latency for processing pipeline
- ✅ Shared memory for processing state
- ❌ Vertical scaling only (single container limits)
- ❌ Cannot independently scale PII processing
- ⚠️ Must carefully manage memory during large file processing

**Mitigation:** Implement streaming processing for large files; defer microservices extraction to post-MVP if scaling requires it.

---

### ADR-002: postgres-js Driver over @neondatabase/serverless

**Context:** Drizzle ORM supports multiple PostgreSQL drivers. Neon provides a serverless driver, but Replit has compatibility issues.

**Decision:** Use `postgres` (postgres-js) package with `drizzle-orm/postgres-js` adapter.

**Consequences:**
- ✅ Works reliably in Replit environment
- ✅ Standard PostgreSQL wire protocol
- ✅ Connection pooling works correctly
- ❌ Cannot use Neon's HTTP-based serverless features
- ❌ Slightly higher latency than HTTP-based queries

**Technical Reason:** @neondatabase/serverless causes "fetch failed" errors in Replit due to internal networking constraints.

---

### ADR-003: JWT Stateless Authentication over Sessions

**Context:** Authentication needs to work with Replit's stateless deployment model and support multiple concurrent users.

**Decision:** Use stateless JWT tokens with sliding expiry stored in localStorage.

**Consequences:**
- ✅ No server-side session storage required
- ✅ Scales horizontally without session sync
- ✅ Works with Replit's cold starts (no session loss)
- ❌ Cannot immediately invalidate tokens (must wait for expiry)
- ❌ Larger request headers than session cookies

**Mitigation:** 7-day expiry limits exposure window; critical security events (password change) could be tracked for forced re-auth post-MVP.

---

### ADR-004: Compromise.js for NER over External Service

**Context:** PII detection requires Named Entity Recognition for person names, company names, and locations.

**Decision:** Use compromise.js (JavaScript NER library) instead of external NER services like spaCy or cloud APIs.

**Consequences:**
- ✅ No external service dependency
- ✅ Zero latency overhead (runs in-process)
- ✅ Free (no API costs)
- ✅ Works in Replit's single container
- ❌ Less accurate than spaCy for complex cases
- ❌ English-only (matches PRD MVP scope)
- ❌ May miss some non-Western names

**Mitigation:** Combine with regex patterns for emails, phones, addresses. Document accuracy limitations. Consider spaCy integration post-MVP for improved accuracy.

---

### ADR-005: In-Process Background Processing over Job Queue

**Context:** Batch processing can take minutes for large files. Users should not wait for completion.

**Decision:** Use async/await pattern with progress tracking in database instead of external job queue (Redis, RabbitMQ).

**Consequences:**
- ✅ No additional infrastructure
- ✅ Simple implementation
- ✅ Works with Replit's single process
- ❌ Processing lost if server restarts mid-job
- ❌ No job retry/recovery mechanism
- ❌ Single processing job at a time

**Mitigation:** Store processing checkpoint in database; allow manual retry on failure; limit one active job per project.

```typescript
// Pattern for async processing
async function startProcessing(projectId: number): Promise<ProcessingRun> {
  const run = await createProcessingRun(projectId, 'processing');
  
  // Fire and forget with proper error handling
  processAsync(run.id).catch(async (error) => {
    console.error(`Processing failed for run ${run.id}:`, error);
    try {
      await db.update(processingRuns)
        .set({ status: 'failed', errorMessage: error.message })
        .where(eq(processingRuns.id, run.id));
    } catch (dbError) {
      console.error('Failed to update processing status:', dbError);
    }
  });
  
  return run;
}
```

---

### ADR-006: Row-Level Security via Application Layer

**Context:** Multi-tenant architecture requires strict data isolation between organizations.

**Decision:** Implement row-level security at application layer (service methods enforce org_id filtering) rather than PostgreSQL RLS policies.

**Consequences:**
- ✅ Portable across databases
- ✅ Easier to debug and test
- ✅ More flexible for complex queries
- ❌ Security depends on correct service implementation
- ❌ Direct database access bypasses protection

**Mitigation:** All service methods accept orgId parameter; create database role with limited permissions for app; add automated tests verifying tenant isolation.

---

### ADR-007: Ephemeral File Storage with Database Persistence

**Context:** Replit has ephemeral filesystem; files don't persist across restarts.

**Decision:** Store uploaded files temporarily for processing, then persist only processed records in PostgreSQL.

**Consequences:**
- ✅ No external file storage needed (S3, etc.)
- ✅ Simpler architecture
- ✅ Processed data always available
- ❌ Cannot re-process from original file after restart
- ❌ Large files consume memory during processing

**Mitigation:** Process files immediately after upload; store source metadata for re-upload if needed; implement streaming for large files.

---

## Section 11: Validation Footer

## Document Validation

### Completeness Checklist
- [x] All PRD features have architectural support
- [x] Technology stack complete with rationale
- [x] Auth flows fully specified
- [x] Integrations classified (required/optional)
- [x] Replit configuration complete
- [x] Security middleware specified
- [x] Minimum 5 ADRs documented (7 provided)

### Confidence Scores

| Section | Score (1-10) | Notes |
|---------|--------------|-------|
| Architectural Overview | 9 | Clear pattern, well-justified |
| Technology Stack | 9 | All choices documented with alternatives |
| PRD Traceability | 9 | Complete mapping |
| Component Architecture | 8 | Interfaces defined, implementation details for Agent 6 |
| Authentication | 9 | Complete flows documented |
| Security | 8 | MVP-appropriate; post-MVP hardening noted |
| Data Architecture | 8 | Clear flow; caching deferred |
| Integrations | 9 | Both classified with fallbacks |
| Replit Configuration | 10 | Comprehensive, tested patterns |
| ADRs | 9 | 7 significant decisions documented |

### Document Status: COMPLETE

---

## Section 12: Downstream Agent Handoff Brief

### For Agent 3: Data Modeling

- **Database:** PostgreSQL via Neon
- **ORM:** Drizzle ORM (Core Select API only - NO Query API)
- **Driver:** `postgres` (postgres-js), NOT @neondatabase/serverless
- **Connection:** Pool with `max: 10`, `idle_timeout: 20`
- **Key Entities:** organizations, users, invitations, projects, sources, field_mappings, processing_configs, processing_runs, processed_records, connections, password_reset_tokens
- **Multi-tenancy:** All tenant-scoped tables require `organization_id` column
- **Soft Delete:** Projects use `deleted_at` timestamp pattern
- **Encryption:** `encrypted_credentials` column on connections table (stored as encrypted string)

### For Agent 4: API Contract

- **Framework:** Express.js 4.x
- **Base Path:** `/api` (not `/api/v1`)
- **Auth:** JWT Bearer tokens (`Authorization: Bearer <token>`)
- **Error Format:** `{ "error": { "code": "<ERROR_CODE>", "message": "<human readable>" } }`
- **Health Endpoint:** `GET /api/health` → `{ "status": "ok", "timestamp": "<ISO8601>" }`
- **Rate Limit Headers:** All responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Validation:** Zod schemas for all request bodies
- **Pagination:** `?page=1&limit=20` pattern; response includes `{ data: [], pagination: { page, limit, total, totalPages } }`

### For Agent 5: UI/UX Specification

- **Framework:** React 18 + Vite 5
- **Components:** shadcn/ui (Tailwind-based)
- **Styling:** Tailwind CSS 4.x with CSS variables
- **State Management:** React Query for server state, React Context for auth
- **Routing:** React Router 6 with protected routes
- **Token Storage:** localStorage (`token` key)
- **Auth Redirect:** 401 response → clear token → redirect to `/login`

### For Agent 6: Implementation Orchestrator

- **Security Middleware Required:** helmet, cors, express-rate-limit, morgan
- **Graceful Shutdown:** SIGTERM handler closing server
- **parseIntParam Validation:** Required for all URL parameter parsing
- **Route Registration Order:** Specific routes before parameterized (e.g., `/users/me` before `/users/:id`)
- **Async Error Handling:** All `.catch()` handlers with DB operations must use `async/await`
- **Service Layer Contract:** Services throw on not-found; controllers catch and format errors

### For Agent 7: QA & Deployment

- **Health Endpoint:** `GET /api/health` → `{ "status": "ok", "timestamp": "<ISO8601>" }`
- **Required Env Vars:** DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
- **Optional Env Vars:** SENDGRID_API_KEY, APP_URL, NODE_ENV
- **Port:** 5000 (production), 3001 (development server)
- **Build Command:** `npm run build`
- **Start Command:** `npm run start`
- **Migration Command:** `npm run db:push` (must be non-interactive)

---

## Document End
