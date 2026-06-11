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

// Simple in-memory session store
export const sessions = new Map<string, { username: string; expiresAt: number }>();

export function createSession(username: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    username,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

export function getSession(token: string): { username: string } | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return { username: session.username };
}

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
      console.log("[Auth] Login attempt for username:", input.username);
      
      // Hardcoded admin credentials for testing
      if (input.username !== "admin" || input.password !== "admin123") {
        console.log("[Auth] Login failed - invalid credentials");
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      console.log("[Auth] Login successful for admin");
      
      // Create a simple session token
      const sessionToken = createSession("admin");
      console.log("[Auth] Created session token");
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return {
        success: true,
        user: {
          id: 1,
          username: "admin",
          email: "admin@redetea.com",
          isActive: true,
        },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie;
    console.log("[Auth.me] Cookie header:", cookieHeader ? `present (${cookieHeader.length} chars)` : "MISSING");
    console.log("[Auth.me] COOKIE_NAME:", COOKIE_NAME);
    console.log("[Auth.me] Sessions count:", sessions.size);
    
    if (!cookieHeader) {
      console.log("[Auth.me] No cookie header, returning null");
      return null;
    }
    
    const cookies = parseCookies(cookieHeader);
    console.log("[Auth.me] Parsed cookies:", Object.keys(cookies));
    const sessionToken = cookies[COOKIE_NAME];
    console.log("[Auth.me] Session token:", sessionToken ? `found (${sessionToken.substring(0, 10)}...)` : "NOT FOUND");
    
    if (!sessionToken) {
      console.log("[Auth.me] No session token, returning null");
      return null;
    }
    
    const session = getSession(sessionToken);
    console.log("[Auth.me] Session lookup:", session ? "FOUND" : "NOT FOUND");
    if (!session) {
      console.log("[Auth.me] Session expired or invalid");
      return null;
    }
    
    console.log("[Auth.me] Returning authenticated user:", session.username);
    return {
      id: 1,
      username: session.username,
      email: "admin@redetea.com",
      isActive: true,
    };
  })
});
