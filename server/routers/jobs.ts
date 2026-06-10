import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createJob,
  getJobById,
  listJobs,
  updateJob,
  deleteJob,
  getJobByExternalId,
  getJobStats,
} from "../db";
import { JobScraper, ScrapedJob } from "../jobScraper";
import { WordPressClient } from "../wordpress";
import { getWpCredentials } from "../db";
import { JOB_CATEGORIES, JOB_LOCATIONS } from "../../shared/constants";
import { TRPCError } from "@trpc/server";

const jobScraper = new JobScraper();

export const jobsRouter = router({
  /**
   * Buscar vagas em fontes externas
   */
  search: protectedProcedure
    .input(
      z.object({
        categories: z.array(z.string()).min(1),
        locations: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validar categorias e locais
        const validCategories = input.categories.filter((c) =>
          JOB_CATEGORIES.includes(c as any)
        );
        const validLocations = input.locations.filter((l) =>
          JOB_LOCATIONS.includes(l as any)
        );

        if (validCategories.length === 0 || validLocations.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid categories or locations",
          });
        }

        // Buscar vagas
        const scrapedJobs = await jobScraper.searchJobs(
          validCategories as any,
          validLocations as any
        );

        // Salvar vagas no banco
        const savedJobs = [];
        for (const job of scrapedJobs) {
          // Verificar se já existe
          const existing = await getJobByExternalId(job.externalId, job.source);
          if (!existing) {
            const saved = await createJob({
              externalId: job.externalId,
              source: job.source,
              title: job.title,
              company: job.company,
              description: job.description,
              city: job.city,
              state: job.state,
              logoUrl: job.logoUrl,
              categories: JSON.stringify(job.categories),
              locations: JSON.stringify(job.locations),
              sourceUrl: job.sourceUrl,
              status: "pending",
            });
            savedJobs.push(saved);
          }
        }

        return {
          total: scrapedJobs.length,
          saved: savedJobs.length,
          jobs: savedJobs,
        };
      } catch (error) {
        console.error("[Jobs] Search failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search jobs",
        });
      }
    }),

  /**
   * Listar vagas com filtros
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.array(z.string()).optional(),
        source: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const jobs = await listJobs({
        status: input.status,
        source: input.source,
        limit: input.limit,
        offset: input.offset,
      });

      return jobs.map((job) => ({
        ...job,
        categories: job.categories ? JSON.parse(job.categories) : [],
        locations: job.locations ? JSON.parse(job.locations) : [],
      }));
    }),

  /**
   * Obter detalhes de uma vaga
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const job = await getJobById(input.id);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return {
        ...job,
        categories: job.categories ? JSON.parse(job.categories) : [],
        locations: job.locations ? JSON.parse(job.locations) : [],
      };
    }),

  /**
   * Atualizar vaga
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        company: z.string().optional(),
        description: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        address: z.string().optional(),
        zipCode: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        categories: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, categories, locations, ...rest } = input;

      const updated = await updateJob(id, {
        ...rest,
        categories: categories ? JSON.stringify(categories) : undefined,
        locations: locations ? JSON.stringify(locations) : undefined,
      });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return {
        ...updated,
        categories: updated.categories ? JSON.parse(updated.categories) : [],
        locations: updated.locations ? JSON.parse(updated.locations) : [],
      };
    }),

  /**
   * Aprovar e publicar vaga no WordPress
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Obter credenciais do WordPress
      const wpCreds = await getWpCredentials(Number(ctx.user.id));
      if (!wpCreds) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WordPress credentials not configured",
        });
      }

      try {
        // Criar cliente WordPress
        const wpClient = new WordPressClient({
          wpUrl: wpCreds.wpUrl,
          wpUsername: wpCreds.wpUsername,
          wpAppPassword: wpCreds.wpAppPassword,
        });

        // Verificar duplicatas no WordPress antes de publicar
        if (job.title) {
          const existingPosts = await wpClient.searchPosts(job.title, 5);
          const duplicate = existingPosts.find(
            (p: any) =>
              p.title?.rendered?.toLowerCase().trim() ===
              job.title?.toLowerCase().trim()
          );
          if (duplicate) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Vaga já existe no WordPress (ID: ${duplicate.id}). Título: "${job.title}"`,
            });
          }
        }

        // Publicar no WordPress
        const wpPost = await wpClient.createPost({
          title: job.title,
          content: job.description || "",
          status: "publish",
          meta: {
            company: job.company || undefined,
            phone: job.phone || undefined,
            email: job.email || undefined,
            address: job.address || undefined,
            zipCode: job.zipCode || undefined,
            website: job.website || undefined,
            city: job.city || undefined,
            state: job.state || undefined,
            logoUrl: job.logoUrl || undefined,
            categories: job.categories ? JSON.parse(job.categories as string) : [],
            locations: job.locations ? JSON.parse(job.locations as string) : [],
            source: job.source as string,
            externalId: (job.externalId || undefined) as string | undefined,
          },
        });

        // Atualizar status no banco
        const updated = await updateJob(input.id, {
          status: "published",
          wpPostId: wpPost.id,
          publishedAt: new Date(),
        });

        return {
          success: true,
          wpPostId: wpPost.id,
          wpLink: wpPost.link,
          job: updated,
        };
      } catch (error) {
        console.error("[Jobs] Failed to publish to WordPress:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to publish to WordPress",
        });
      }
    }),

  /**
   * Rejeitar vaga
   */
  reject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const updated = await updateJob(input.id, {
        status: "rejected",
      });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return updated;
    }),

  /**
   * Obter estatísticas
   */
  stats: protectedProcedure.query(async () => {
    return getJobStats();
  }),

  /**
   * Deletar vaga
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteJob(input.id);
      return { success: true };
    }),

  /**
   * Deletar vaga do WordPress
   */
  deleteFromWordPress: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const wpCreds = await getWpCredentials(Number(ctx.user.id));
      if (!wpCreds) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WordPress credentials not configured",
        });
      }

      try {
        const wpClient = new WordPressClient({
          wpUrl: wpCreds.wpUrl,
          wpUsername: wpCreds.wpUsername,
          wpAppPassword: wpCreds.wpAppPassword,
        });

        const success = await wpClient.deletePost(input.postId, true);
        if (!success) {
          throw new Error("Failed to delete post from WordPress");
        }

        return { success: true, message: "Vaga removida do WordPress" };
      } catch (error) {
        console.error("[Jobs] Failed to delete from WordPress:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete from WordPress",
        });
      }
    }),

  /**
   * Listar histórico de vagas publicadas no WordPress
   */
  history: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        perPage: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const wpCreds = await getWpCredentials(Number(ctx.user.id));
      if (!wpCreds) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WordPress credentials not configured",
        });
      }

      try {
        const wpClient = new WordPressClient({
          wpUrl: wpCreds.wpUrl,
          wpUsername: wpCreds.wpUsername,
          wpAppPassword: wpCreds.wpAppPassword,
        });

        const result = await wpClient.getAllPosts(input.page, input.perPage);

        const posts = result.posts.map((post: any) => ({
          id: post.id,
          title: post.title?.rendered || "",
          content: post.content?.rendered || "",
          link: post.link,
          date: post.date,
          modified: post.modified,
          status: post.status,
          meta: post.meta || {},
        }));

        return {
          posts,
          total: result.total,
          pages: result.pages,
          currentPage: input.page,
        };
      } catch (error) {
        console.error("[Jobs] Failed to fetch history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch history from WordPress",
        });
      }
    }),
});
