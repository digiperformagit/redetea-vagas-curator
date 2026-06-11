import { defineConfig } from "drizzle-kit";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Detect if using SQLite or PostgreSQL
const isSQLite = connectionString.startsWith("file:");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: isSQLite ? "sqlite" : "postgresql",
  ...(isSQLite 
    ? {
        dbCredentials: {
          url: connectionString,
        },
      }
    : {
        dbCredentials: {
          url: connectionString,
        },
      }
  ),
});
