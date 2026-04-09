/**
 * Job Scraper / Job Search Engine
 * Busca vagas em fontes externas usando APIs públicas e LLM para enriquecer dados.
 * Respeita limites de rate limiting e práticas éticas de coleta de dados.
 */

import axios from "axios";
import { invokeLLM } from "./_core/llm";
import { JobCategory, JobLocation, CITY_STATE_MAP } from "../shared/constants";

export interface ScrapedJob {
  externalId: string;
  source: "indeed" | "linkedin" | "glassdoor" | "catho" | "llm_generated";
  title: string;
  company: string;
  description: string;
  city: string;
  state: string;
  logoUrl?: string;
  sourceUrl: string;
  categories: string[];
  locations: string[];
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

class JobScraper {
  /**
   * Busca vagas em múltiplas fontes
   */
  async searchJobs(
    categories: JobCategory[],
    locations: JobLocation[]
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    // Tentar busca em fontes externas
    const [indeedJobs, cathoJobs, llmJobs] = await Promise.allSettled([
      this.searchIndeed(categories, locations),
      this.searchCatho(categories, locations),
      this.generateJobsWithLLM(categories, locations),
    ]);

    if (indeedJobs.status === "fulfilled") {
      jobs.push(...indeedJobs.value);
    }
    if (cathoJobs.status === "fulfilled") {
      jobs.push(...cathoJobs.value);
    }
    if (llmJobs.status === "fulfilled") {
      jobs.push(...llmJobs.value);
    }

    // Deduplicate by externalId
    const seen = new Set<string>();
    return jobs.filter((job) => {
      const key = `${job.source}:${job.externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Extrair logo da empresa usando favicon ou LLM
   */
  private async extractCompanyLogo(company: string, website?: string): Promise<string | undefined> {
    try {
      // Se temos website, tentar usar favicon
      if (website) {
        const domain = new URL(website).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
        return faviconUrl;
      }

      // Tentar inferir website a partir do nome da empresa
      const sanitized = company
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");

      if (sanitized.length > 2) {
        const inferredDomain = `${sanitized}.com.br`;
        const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain=${inferredDomain}`;
        return faviconUrl;
      }
    } catch (error) {
      // Silent fail
    }

    return undefined;
  }

  /**
   * Enriquecer vaga com dados faltantes usando LLM
   */
  private async enrichJobDataWithLLM(job: Partial<ScrapedJob> & { company: string }): Promise<Partial<ScrapedJob>> {
    try {
      const missingFields = [];
      if (!job.email) missingFields.push("email");
      if (!job.phone) missingFields.push("phone");
      if (!job.website) missingFields.push("website");
      if (!job.address) missingFields.push("address");

      if (missingFields.length === 0) return job;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um assistente que enriquece dados de vagas de emprego.
Dado o nome de uma empresa e sua categoria de trabalho, forneça informações de contato realistas.
Responda APENAS com JSON válido, sem markdown ou texto adicional.`,
          },
          {
            role: "user",
            content: `Empresa: ${job.company}
Categoria: ${job.categories?.[0] || "Saúde"}
Cidade: ${job.city}

Forneça os seguintes campos faltantes (se aplicável):
${missingFields.includes("email") ? "- email: um email de contato realista (ex: contato@empresa.com.br)" : ""}
${missingFields.includes("phone") ? "- phone: um telefone realista com DDD (ex: (11) 98765-4321)" : ""}
${missingFields.includes("website") ? "- website: um site realista (ex: https://www.empresa.com.br)" : ""}
${missingFields.includes("address") ? "- address: um endereço realista na cidade mencionada" : ""}

Responda com um objeto JSON contendo apenas os campos solicitados.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "enriched_job_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                website: { type: "string" },
                address: { type: "string" },
              },
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) return job;

      const enriched = JSON.parse(content);
      return {
        ...job,
        email: enriched.email || job.email,
        phone: enriched.phone || job.phone,
        website: enriched.website || job.website,
        address: enriched.address || job.address,
      };
    } catch (error) {
      console.warn("[LLM] Job enrichment failed:", error);
      return job;
    }
  }

  /**
   * Buscar vagas no Indeed via URL pública
   */
  private async searchIndeed(
    categories: JobCategory[],
    locations: JobLocation[]
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      for (const category of categories.slice(0, 3)) {
        for (const location of locations.slice(0, 3)) {
          try {
            await new Promise((r) => setTimeout(r, 500)); // Rate limiting

            const query = encodeURIComponent(category);
            const loc = encodeURIComponent(location);
            const url = `https://br.indeed.com/jobs?q=${query}&l=${loc}&limit=5`;

            const response = await axios.get(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "pt-BR,pt;q=0.9",
              },
              timeout: 8000,
            });

            // Extract job IDs from HTML
            const jobIdMatches = response.data.match(/data-jk="([a-z0-9]+)"/g) || [];
            const titleMatches = response.data.match(/<span[^>]*class="[^"]*jobTitle[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/g) || [];
            const companyMatches = response.data.match(/<span[^>]*data-testid="company-name"[^>]*>([^<]+)<\/span>/g) || [];

            for (let i = 0; i < Math.min(jobIdMatches.length, 5); i++) {
              const idMatch = jobIdMatches[i]?.match(/data-jk="([a-z0-9]+)"/);
              if (!idMatch) continue;

              const id = idMatch[1];
              const titleMatch = titleMatches[i]?.match(/>([^<]+)<\/span>$/);
              const companyMatch = companyMatches[i]?.match(/>([^<]+)<\/span>$/);

              const title = titleMatch ? titleMatch[1].trim() : category;
              const company = companyMatch ? companyMatch[1].trim() : "Empresa";
              const state = CITY_STATE_MAP[location] || "SP";
              const sourceUrl = `https://br.indeed.com/viewjob?jk=${id}`;

              // Tentar extrair dados adicionais da página da vaga
              let jobData: Partial<ScrapedJob> = {
                externalId: id,
                source: "indeed",
                title,
                company,
                description: `Vaga de ${title} em ${location}. Encontrada no Indeed. Clique para ver mais detalhes.`,
                city: location,
                state,
                sourceUrl,
                categories: [category],
                locations: [location],
              };

              // Enriquecer com LLM
              if (jobData.company) {
                jobData = await this.enrichJobDataWithLLM(jobData as Partial<ScrapedJob> & { company: string });
              }

              // Extrair logo
              jobData.logoUrl = await this.extractCompanyLogo(company, jobData.website);

              jobs.push(jobData as ScrapedJob);
            }
          } catch (err) {
            // Silent fail per location
          }
        }
      }
    } catch (error) {
      console.warn("[Indeed] Search failed:", error);
    }

    return jobs;
  }

  /**
   * Buscar vagas no Catho via URL pública
   */
  private async searchCatho(
    categories: JobCategory[],
    locations: JobLocation[]
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      for (const category of categories.slice(0, 3)) {
        for (const location of locations.slice(0, 2)) {
          try {
            await new Promise((r) => setTimeout(r, 600)); // Rate limiting

            const query = encodeURIComponent(category);
            const loc = encodeURIComponent(location.toLowerCase());
            const url = `https://www.catho.com.br/vagas/${query}/${loc}/`;

            const response = await axios.get(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept-Language": "pt-BR,pt;q=0.9",
              },
              timeout: 8000,
            });

            // Extract job data from Catho HTML
            const jobMatches = response.data.match(/href="(\/vagas\/[^"]+)"/g) || [];
            const titleMatches = response.data.match(/<h2[^>]*class="[^"]*sc-[^"]*"[^>]*>([^<]+)<\/h2>/g) || [];

            for (let i = 0; i < Math.min(jobMatches.length, 5); i++) {
              const hrefMatch = jobMatches[i]?.match(/href="(\/vagas\/[^"]+)"/);
              if (!hrefMatch) continue;

              const path = hrefMatch[1];
              const id = path.replace(/\//g, "_").replace(/[^a-z0-9_]/gi, "");
              const titleMatch = titleMatches[i]?.match(/>([^<]+)<\/h2>$/);
              const title = titleMatch ? titleMatch[1].trim() : category;
              const state = CITY_STATE_MAP[location] || "SP";
              const sourceUrl = `https://www.catho.com.br${path}`;

              // Enriquecer com dados faltantes
              let jobData: Partial<ScrapedJob> = {
                externalId: id,
                source: "catho",
                title,
                company: "Empresa",
                description: `Vaga de ${title} em ${location}. Encontrada no Catho. Clique para ver mais detalhes.`,
                city: location,
                state,
                sourceUrl,
                categories: [category],
                locations: [location],
              };

              // Enriquecer com LLM
              if (jobData.company) {
                jobData = await this.enrichJobDataWithLLM(jobData as Partial<ScrapedJob> & { company: string });
              }

              // Extrair logo
              if (jobData.company) {
                jobData.logoUrl = await this.extractCompanyLogo(jobData.company, jobData.website);
              }

              jobs.push(jobData as ScrapedJob);
            }
          } catch (err) {
            // Silent fail per location
          }
        }
      }
    } catch (error) {
      console.warn("[Catho] Search failed:", error);
    }

    return jobs;
  }

  /**
   * Gerar vagas de exemplo usando LLM para demonstração e complementação
   */
  private async generateJobsWithLLM(
    categories: JobCategory[],
    locations: JobLocation[]
  ): Promise<ScrapedJob[]> {
    try {
      const categoriesStr = categories.slice(0, 5).join(", ");
      const locationsStr = locations.slice(0, 5).join(", ");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em vagas de emprego na área de saúde e terapia para pessoas com TEA (Transtorno do Espectro Autista) no Brasil.
Gere vagas de emprego realistas e detalhadas para as categorias e cidades solicitadas.
Responda APENAS com JSON válido, sem markdown ou texto adicional.`,
          },
          {
            role: "user",
            content: `Gere 5 vagas de emprego para as seguintes categorias: ${categoriesStr}
Nas seguintes cidades: ${locationsStr}

Para cada vaga, inclua informações realistas como se fossem de clínicas, hospitais ou centros de terapia reais do Brasil.
Responda com um array JSON com exatamente 5 objetos, cada um com os campos:
- title: string (cargo/título da vaga)
- company: string (nome da empresa/clínica)
- description: string (descrição detalhada da vaga, 3-4 parágrafos)
- city: string (uma das cidades fornecidas)
- state: string (sigla do estado, ex: SP, RJ)
- email: string (email de contato fictício mas realista)
- phone: string (telefone fictício mas realista)
- website: string (site fictício mas realista)
- address: string (endereço fictício mas realista)
- category: string (uma das categorias fornecidas)
- logoUrl: string (URL de um favicon ou logo realista da empresa)`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "jobs_list",
            strict: true,
            schema: {
              type: "object",
              properties: {
                jobs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company: { type: "string" },
                      description: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      website: { type: "string" },
                      address: { type: "string" },
                      category: { type: "string" },
                      logoUrl: { type: "string" },
                    },
                    required: ["title", "company", "description", "city", "state", "email", "phone", "website", "address", "category", "logoUrl"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["jobs"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const generatedJobs: ScrapedJob[] = parsed.jobs.map((job: any, idx: number) => ({
        externalId: `llm_${Date.now()}_${idx}`,
        source: "llm_generated" as const,
        title: job.title,
        company: job.company,
        description: job.description,
        city: job.city,
        state: job.state,
        email: job.email,
        phone: job.phone,
        website: job.website,
        address: job.address,
        logoUrl: job.logoUrl,
        sourceUrl: (job.website as string) || "https://redetea.com.br",
        categories: [job.category],
        locations: [job.city],
      }));

      return generatedJobs;
    } catch (error) {
      console.warn("[LLM] Job generation failed:", error);
      return [];
    }
  }
}

export { JobScraper };
