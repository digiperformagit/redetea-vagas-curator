import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  setWpCredentials,
  getWpCredentials,
  deleteWpCredentials,
  updateWpCredentialsLastTested,
} from "../db";
import { WordPressClient } from "../wordpress";
import { TRPCError } from "@trpc/server";

export const wpCredentialsRouter = router({
  /**
   * Salvar credenciais do WordPress
   */
  set: protectedProcedure
    .input(
      z.object({
        wpUrl: z.string().url(),
        wpUsername: z.string().min(1),
        wpAppPassword: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validar credenciais testando conexão
        const wpClient = new WordPressClient({
          wpUrl: input.wpUrl,
          wpUsername: input.wpUsername,
          wpAppPassword: input.wpAppPassword,
        });

        const isConnected = await wpClient.testConnection();
        if (!isConnected) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to connect to WordPress. Check credentials.",
          });
        }

        // Salvar credenciais
        const creds = await setWpCredentials(Number(ctx.user.id), {
          wpUrl: input.wpUrl,
          wpUsername: input.wpUsername,
          wpAppPassword: input.wpAppPassword,
          isActive: true,
          lastTestedAt: new Date(),
        });

        return {
          success: true,
          message: "Credentials saved successfully",
          lastTestedAt: creds.lastTestedAt,
        };
      } catch (error) {
        console.error("[WP Credentials] Failed to set credentials:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to save credentials",
        });
      }
    }),

  /**
   * Obter credenciais (sem password)
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getWpCredentials(Number(ctx.user.id));
    if (!creds) {
      return null;
    }

    // Não retornar a senha
    return {
      id: creds.id,
      wpUrl: creds.wpUrl,
      wpUsername: creds.wpUsername,
      isActive: Boolean(creds.isActive),
      lastTestedAt: creds.lastTestedAt,
      createdAt: creds.createdAt,
      updatedAt: creds.updatedAt,
    };
  }),

  /**
   * Testar conexão com WordPress
   */
  test: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const creds = await getWpCredentials(Number(ctx.user.id));
      if (!creds) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WordPress credentials not configured",
        });
      }

      const wpClient = new WordPressClient({
        wpUrl: creds.wpUrl,
        wpUsername: creds.wpUsername,
        wpAppPassword: creds.wpAppPassword,
      });

      const isConnected = await wpClient.testConnection();

      if (isConnected) {
        // Atualizar lastTestedAt
        await updateWpCredentialsLastTested(Number(ctx.user.id));

        return {
          success: true,
          message: "Connected successfully",
          lastTestedAt: new Date(),
        };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to WordPress",
        });
      }
    } catch (error) {
      console.error("[WP Credentials] Test failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Test failed",
      });
    }
  }),

  /**
   * Deletar credenciais
   */
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await deleteWpCredentials(Number(ctx.user.id));
      return { success: true, message: "Credentials deleted" };
    } catch (error) {
      console.error("[WP Credentials] Delete failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete credentials",
      });
    }
  }),
});
