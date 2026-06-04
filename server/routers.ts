import { systemRouter } from "./_core/systemRouter";
import { jobsRouter } from "./routers/jobs";
import { wpCredentialsRouter } from "./routers/wpCredentials";
import { authRouter } from "./routers/auth";
import { router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  jobs: jobsRouter,
  wpCredentials: wpCredentialsRouter,
});

export type AppRouter = typeof appRouter;
