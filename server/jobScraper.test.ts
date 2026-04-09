import { describe, expect, it, vi, beforeEach } from "vitest";
import { JobScraper } from "./jobScraper";

// Mock the LLM helper
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            jobs: [
              {
                title: "Psicólogo Clínico",
                company: "Clínica Bem Estar",
                description: "Vaga para psicólogo com experiência em TEA",
                city: "São Paulo",
                state: "SP",
                email: "contato@clinica.com.br",
                phone: "(11) 98765-4321",
                website: "https://clinica.com.br",
                address: "Rua das Flores, 123",
                category: "Psicólogo",
                logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=clinica.com.br",
              },
            ],
          }),
        },
      },
    ],
  }),
}));

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: `
        <html>
          <span data-jk="abc123"></span>
          <span class="jobTitle"><span>Psicólogo</span></span>
          <span data-testid="company-name">Clínica Teste</span>
        </html>
      `,
    }),
  },
}));

describe("JobScraper", () => {
  let scraper: JobScraper;

  beforeEach(() => {
    scraper = new JobScraper();
  });

  it("deve gerar vagas com todos os campos preenchidos via LLM", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    // Deve ter pelo menos uma vaga gerada
    expect(jobs.length).toBeGreaterThan(0);

    // Verificar se há vaga LLM com campos completos
    const llmJob = jobs.find((j) => j.source === "llm_generated");
    if (llmJob) {
      expect(llmJob.title).toBeDefined();
      expect(llmJob.company).toBeDefined();
      expect(llmJob.description).toBeDefined();
      expect(llmJob.email).toBeDefined();
      expect(llmJob.phone).toBeDefined();
      expect(llmJob.website).toBeDefined();
      expect(llmJob.address).toBeDefined();
      expect(llmJob.logoUrl).toBeDefined();
    }
  });

  it("deve ter externalId único para cada vaga", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    const ids = jobs.map((j) => `${j.source}:${j.externalId}`);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("deve respeitar as categorias e locais fornecidos", async () => {
    const jobs = await scraper.searchJobs(
      ["Psicólogo", "Fonoaudióloga"],
      ["São Paulo", "Campinas"]
    );

    jobs.forEach((job) => {
      expect(["Psicólogo", "Fonoaudióloga"]).toContain(job.categories[0]);
      expect(["São Paulo", "Campinas"]).toContain(job.locations[0]);
    });
  });

  it("deve incluir sourceUrl em todas as vagas", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    jobs.forEach((job) => {
      expect(job.sourceUrl).toBeDefined();
      expect(job.sourceUrl.length).toBeGreaterThan(0);
    });
  });

  it("deve validar formato de email quando presente", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    jobs.forEach((job) => {
      if (job.email) {
        // Validação básica de email
        expect(job.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
    });
  });

  it("deve validar formato de telefone quando presente", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    jobs.forEach((job) => {
      if (job.phone) {
        // Validação básica de telefone brasileiro
        expect(job.phone).toMatch(/\(\d{2}\)\s?\d{4,5}-\d{4}/);
      }
    });
  });

  it("deve validar URL de website quando presente", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    jobs.forEach((job) => {
      if (job.website) {
        expect(job.website).toMatch(/^https?:\/\//);
      }
    });
  });

  it("deve validar URL de logo quando presente", async () => {
    const jobs = await scraper.searchJobs(["Psicólogo"], ["São Paulo"]);

    jobs.forEach((job) => {
      if (job.logoUrl) {
        expect(job.logoUrl).toMatch(/^https?:\/\//);
      }
    });
  });
});
