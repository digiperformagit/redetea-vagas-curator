CREATE TABLE IF NOT EXISTS "public"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL UNIQUE,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(20) NOT NULL DEFAULT 'user',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"externalId" varchar(255),
	"source" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"description" text,
	"city" varchar(100),
	"state" varchar(2),
	"address" varchar(255),
	"zipCode" varchar(20),
	"email" varchar(255),
	"phone" varchar(20),
	"website" varchar(255),
	"logoUrl" varchar(255),
	"categories" text,
	"locations" text,
	"status" varchar(20) NOT NULL DEFAULT 'pending',
	"wpPostId" serial,
	"sourceUrl" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp
);

CREATE TABLE IF NOT EXISTS "public"."wpCredentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" serial NOT NULL,
	"wpUrl" varchar(255) NOT NULL,
	"wpUsername" varchar(255) NOT NULL,
	"wpAppPassword" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastTestedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "public"."simple_auth_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"email" varchar(320),
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Insert admin user if it doesn't exist
INSERT INTO "public"."simple_auth_users" ("username", "password", "email", "is_active", "createdAt", "updatedAt")
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin@redetea.com', true, now(), now())
ON CONFLICT ("username") DO NOTHING;
