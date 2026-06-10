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

      // Set session cookie
      const sessionToken = crypto.randomBytes(32).toString("hex");
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
    
    // Return a basic user object to indicate authenticated state
    // In production, you'd validate the token against a sessions table
    return {
      id: 1,
      username: "admin",
      email: "admin@redetea.com",
      isActive: true,
    };
  })
});
