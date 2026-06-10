CREATE TABLE "jobs" (
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
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"wpPostId" serial NOT NULL,
	"sourceUrl" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"userId" serial NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "simple_auth_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"email" varchar(320),
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "simple_auth_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wpCredentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" serial NOT NULL,
	"wpUrl" varchar(255) NOT NULL,
	"wpUsername" varchar(255) NOT NULL,
	"wpAppPassword" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastTestedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_simple_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."simple_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wpCredentials" ADD CONSTRAINT "wpCredentials_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;