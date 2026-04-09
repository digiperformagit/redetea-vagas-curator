import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 255 }),
  source: varchar("source", { length: 50 }).notNull(), // indeed, linkedin, glassdoor, catho
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  description: text("description"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  address: varchar("address", { length: 255 }),
  zipCode: varchar("zipCode", { length: 20 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  website: varchar("website", { length: 255 }),
  logoUrl: varchar("logoUrl", { length: 255 }),
  categories: text("categories"), // JSON array
  locations: text("locations"), // JSON array
  status: mysqlEnum("status", ["pending", "approved", "rejected", "published"]).default("pending").notNull(),
  wpPostId: int("wpPostId"),
  sourceUrl: varchar("sourceUrl", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const wpCredentials = mysqlTable("wpCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  wpUrl: varchar("wpUrl", { length: 255 }).notNull(),
  wpUsername: varchar("wpUsername", { length: 255 }).notNull(),
  wpAppPassword: text("wpAppPassword").notNull(), // Encrypted
  isActive: int("isActive").default(1).notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WpCredential = typeof wpCredentials.$inferSelect;
export type InsertWpCredential = typeof wpCredentials.$inferInsert;