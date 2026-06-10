import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { simpleAuthUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

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
    // For simple auth, we check if there's a valid session in the context
    // The context is populated by createContext which checks the cookie
    // For now, we'll return a minimal user object if a session cookie exists
    const db = await getDb();
    if (!db || !ctx.req.cookies || !ctx.req.cookies[COOKIE_NAME]) {
      return null;
    }
    
    // In a real app, you'd validate the session token against a sessions table
    // For now, we'll just return a basic user object to indicate authenticated state
    return {
      id: 1,
      username: "admin",
      email: "admin@redetea.com",
      isActive: true,
    };
  })
});
