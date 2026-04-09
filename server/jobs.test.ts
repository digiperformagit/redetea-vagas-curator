import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database helpers
vi.mock("./db", () => ({
  createJob: vi.fn(),
  getJobById: vi.fn(),
  listJobs: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  getJobByExternalId: vi.fn(),
  getJobStats: vi.fn(),
  getWpCredentials: vi.fn(),
  setWpCredentials: vi.fn(),
  deleteWpCredentials: vi.fn(),
  updateWpCredentialsLastTested: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// Mock the job scraper
vi.mock("./jobScraper", () => ({
  JobScraper: vi.fn().mockImplementation(() => ({
    searchJobs: vi.fn().mockResolvedValue([
      {
        externalId: "test_001",
        source: "llm_generated",
        title: "Psicólogo Clínico",
        company: "Clínica Bem Estar",
        description: "Vaga para psicólogo com experiência em TEA",
        city: "São Paulo",
        state: "SP",
        sourceUrl: "https://example.com/vaga/1",
        categories: ["Psicólogo"],
        locations: ["São Paulo"],
        email: "contato@clinica.com",
        phone: "(11) 99999-9999",
        website: "https://clinica.com",
        address: "Rua das Flores, 123",
      },
    ]),
  })),
}));

// Mock WordPress client
vi.mock("./wordpress", () => ({
  WordPressClient: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn().mockResolvedValue(true),
    createPost: vi.fn().mockResolvedValue({ id: 42, link: "https://redetea.com.br/?p=42" }),
    searchPosts: vi.fn().mockResolvedValue([]),
  })),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("jobs.stats", () => {
  it("retorna estatísticas de vagas", async () => {
    const { getJobStats } = await import("./db");
    vi.mocked(getJobStats).mockResolvedValue({
      pending: 3,
      approved: 1,
      rejected: 0,
      published: 5,
      total: 9,
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobs.stats();

    expect(result).toEqual({
      pending: 3,
      approved: 1,
      rejected: 0,
      published: 5,
      total: 9,
    });
  });
});

describe("jobs.get", () => {
  it("retorna uma vaga pelo ID", async () => {
    const { getJobById } = await import("./db");
    vi.mocked(getJobById).mockResolvedValue({
      id: 1,
      externalId: "ext_001",
      source: "llm_generated",
      title: "Psicólogo Clínico",
      company: "Clínica Bem Estar",
      description: "Descrição da vaga",
      city: "São Paulo",
      state: "SP",
      address: null,
      zipCode: null,
      email: null,
      phone: null,
      website: null,
      logoUrl: null,
      categories: '["Psicólogo"]',
      locations: '["São Paulo"]',
      sourceUrl: "https://example.com",
      status: "pending",
      wpPostId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobs.get({ id: 1 });

    expect(result.id).toBe(1);
    expect(result.title).toBe("Psicólogo Clínico");
    expect(result.categories).toEqual(["Psicólogo"]);
    expect(result.locations).toEqual(["São Paulo"]);
  });

  it("lança NOT_FOUND quando vaga não existe", async () => {
    const { getJobById } = await import("./db");
    vi.mocked(getJobById).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.jobs.get({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("jobs.reject", () => {
  it("rejeita uma vaga existente", async () => {
    const { updateJob } = await import("./db");
    vi.mocked(updateJob).mockResolvedValue({
      id: 1,
      externalId: "ext_001",
      source: "llm_generated",
      title: "Psicólogo Clínico",
      company: "Clínica Bem Estar",
      description: "Descrição",
      city: "São Paulo",
      state: "SP",
      address: null,
      zipCode: null,
      email: null,
      phone: null,
      website: null,
      logoUrl: null,
      categories: '["Psicólogo"]',
      locations: '["São Paulo"]',
      sourceUrl: null,
      status: "rejected",
      wpPostId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobs.reject({ id: 1 });

    expect(result.status).toBe("rejected");
  });
});

describe("jobs.approve", () => {
  it("lança PRECONDITION_FAILED quando credenciais WP não estão configuradas", async () => {
    const { getJobById, getWpCredentials } = await import("./db");
    vi.mocked(getJobById).mockResolvedValue({
      id: 1,
      externalId: "ext_001",
      source: "llm_generated",
      title: "Psicólogo Clínico",
      company: "Clínica Bem Estar",
      description: "Descrição",
      city: "São Paulo",
      state: "SP",
      address: null,
      zipCode: null,
      email: null,
      phone: null,
      website: null,
      logoUrl: null,
      categories: '["Psicólogo"]',
      locations: '["São Paulo"]',
      sourceUrl: null,
      status: "pending",
      wpPostId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getWpCredentials).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.jobs.approve({ id: 1 })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});

describe("wpCredentials.get", () => {
  it("retorna null quando não há credenciais configuradas", async () => {
    const { getWpCredentials } = await import("./db");
    vi.mocked(getWpCredentials).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wpCredentials.get();

    expect(result).toBeNull();
  });

  it("retorna credenciais sem a senha", async () => {
    const { getWpCredentials } = await import("./db");
    vi.mocked(getWpCredentials).mockResolvedValue({
      id: 1,
      userId: 1,
      wpUrl: "https://redetea.com.br",
      wpUsername: "admin",
      wpAppPassword: "super_secret_password",
      isActive: 1,
      lastTestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wpCredentials.get();

    expect(result).not.toBeNull();
    expect(result?.wpUrl).toBe("https://redetea.com.br");
    expect(result?.wpUsername).toBe("admin");
    // Senha não deve ser retornada
    expect((result as any)?.wpAppPassword).toBeUndefined();
  });
});
