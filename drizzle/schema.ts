import { pgTable, serial, varchar, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["user", "admin"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
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
  status: pgEnum("status", ["pending", "approved", "rejected", "published"]),
  wpPostId: serial("wpPostId"),
  sourceUrl: varchar("sourceUrl", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const wpCredentials = pgTable("wpCredentials", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  wpUrl: varchar("wpUrl", { length: 255 }).notNull(),
  wpUsername: varchar("wpUsername", { length: 255 }).notNull(),
  wpAppPassword: text("wpAppPassword").notNull(), // Encrypted
  isActive: boolean("isActive").default(true).notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WpCredential = typeof wpCredentials.$inferSelect;
export type InsertWpCredential = typeof wpCredentials.$inferInsert;

export const simpleAuthUsers = pgTable("simple_auth_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SimpleAuthUser = typeof simpleAuthUsers.$inferSelect;
export type InsertSimpleAuthUser = typeof simpleAuthUsers.$inferInsert;
