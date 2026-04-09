import { eq, and, inArray, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, jobs, wpCredentials, Job, InsertJob, WpCredential, InsertWpCredential } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= JOBS QUERIES =============

export async function createJob(job: InsertJob): Promise<Job> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(jobs).values(job);
  const jobId = result[0].insertId;

  const createdJob = await db.select().from(jobs).where(eq(jobs.id, Number(jobId))).limit(1);
  if (!createdJob[0]) throw new Error("Failed to create job");

  return createdJob[0];
}

export async function getJobById(id: number): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function listJobs(filters?: {
  status?: string[];
  category?: string;
  city?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<Job[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(jobs) as any;
  const conditions: any[] = [];

  if (filters?.status && filters.status.length > 0) {
    conditions.push(inArray(jobs.status, filters.status as any));
  }

  if (filters?.source) {
    conditions.push(eq(jobs.source, filters.source));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(jobs.createdAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return query;
}

export async function updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(jobs).set({ ...data, updatedAt: new Date() }).where(eq(jobs.id, id));

  return getJobById(id);
}

export async function deleteJob(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function getJobByExternalId(externalId: string, source: string): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.externalId, externalId), eq(jobs.source, source)))
    .limit(1);

  return result[0];
}

export async function getJobStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  published: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, published: 0 };

  const result = await (db.select().from(jobs) as any);

  return {
    pending: result.filter((j: any) => j.status === "pending").length,
    approved: result.filter((j: any) => j.status === "approved").length,
    rejected: result.filter((j: any) => j.status === "rejected").length,
    published: result.filter((j: any) => j.status === "published").length,
  };
}

// ============= WP CREDENTIALS QUERIES =============

export async function setWpCredentials(userId: number, creds: Omit<InsertWpCredential, 'userId'>): Promise<WpCredential> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if credentials already exist
  const existing = await db
    .select()
    .from(wpCredentials)
    .where(eq(wpCredentials.userId, userId))
    .limit(1);

  if (existing[0]) {
    // Update existing
    await db
      .update(wpCredentials)
      .set({ ...creds, updatedAt: new Date() })
      .where(eq(wpCredentials.userId, userId));

    const updated = await db
      .select()
      .from(wpCredentials)
      .where(eq(wpCredentials.userId, userId))
      .limit(1);

    if (!updated[0]) throw new Error("Failed to update credentials");
    return updated[0];
  } else {
    // Create new
    await db.insert(wpCredentials).values({
      userId,
      ...creds,
    });

    const created = await db
      .select()
      .from(wpCredentials)
      .where(eq(wpCredentials.userId, userId))
      .limit(1);

    if (!created[0]) throw new Error("Failed to create credentials");
    return created[0];
  }
}

export async function getWpCredentials(userId: number): Promise<WpCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await (db
    .select()
    .from(wpCredentials)
    .where(and(eq(wpCredentials.userId, userId), eq(wpCredentials.isActive, 1)))
    .limit(1) as any);

  return result[0];
}

export async function deleteWpCredentials(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(wpCredentials).where(eq(wpCredentials.userId, userId));
}

export async function updateWpCredentialsLastTested(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(wpCredentials)
    .set({ lastTestedAt: new Date() })
    .where(eq(wpCredentials.userId, userId));
}
