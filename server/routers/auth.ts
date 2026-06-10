import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { simpleAuthUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { parse as parseCookies } from "cookie";
import { sql } from "drizzle-orm";

// Utility to parse cookie header string
function parseCookieHeader(cookieStr: string): Record<string, string> {
  return parseCookies(cookieStr);
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = await db
        .select()
        .from(simpleAuthUsers)
        .where(eq(simpleAuthUsers.username, input.username))
        .limit(1);

      if (!user.length || user[0].password !== hashPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      if (!user[0].isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is inactive" });
      }

      // Create session token and store in database
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      try {
        const { sessions } = await import("../../drizzle/schema");
        const userId = typeof user[0].id === 'string' ? parseInt(user[0].id, 10) : user[0].id;
        console.log("[Auth] Creating session for userId:", userId, "type:", typeof userId);
        await db.insert(sessions).values({
          token: sessionToken,
          userId: userId,
          expiresAt,
        });
        console.log("[Auth] Session created successfully");
      } catch (error) {
        console.error("[Auth] Error creating session:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create session" });
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return {
        success: true,
        user: user[0],
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    // Parse cookies from the Cookie header (req.cookies is not available without cookie-parser)
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) {
      return null;
    }
    
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies[COOKIE_NAME];
    
    if (!sessionToken) {
      return null;
    }
    
    // Validate session token against database
    const db = await getDb();
    if (!db) {
      return null;
    }
    
    try {
      const { sessions } = await import("../../drizzle/schema");
      
      const session = await db
        .select()
        .from(sessions)
        .where(
          sql`${sessions.token} = ${sessionToken} AND ${sessions.expiresAt} > now()`
        )
        .limit(1);
      
      if (!session.length) {
        return null;
      }
      
      // Get user info
      const user = await db
        .select()
        .from(simpleAuthUsers)
        .where(sql`${simpleAuthUsers.id} = ${session[0].userId}`)
        .limit(1);
      
      if (!user.length) {
        return null;
      }
      
      const userData = user[0];
      if (!userData.isActive) {
        return null;
      }
      
      return {
        id: userData.id,
        username: userData.username,
        email: userData.email || "",
        isActive: userData.isActive,
      };
    } catch (error) {
      console.error("[Auth] Error validating session:", error);
      return null;
    }
  })
});
