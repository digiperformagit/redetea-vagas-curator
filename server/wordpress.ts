/**
 * WordPress API Integration Helper
 * Handles authentication and publishing of jobs to WordPress
 */

import axios, { AxiosInstance } from "axios";

interface WordPressConfig {
  wpUrl: string;
  wpUsername: string;
  wpAppPassword: string;
}

interface WordPressJob {
  title: string;
  content: string;
  status: "publish" | "draft";
  meta?: {
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    zipCode?: string;
    website?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
    categories?: string[];
    locations?: string[];
    source?: string;
    externalId?: string;
  };
  categories?: number[];
  tags?: number[];
}

class WordPressClient {
  private client: AxiosInstance;
  private config: WordPressConfig;

  constructor(config: WordPressConfig) {
    this.config = config;

    // Normalize URL (remove trailing slash)
    const baseURL = config.wpUrl.replace(/\/$/, "");

    // Create axios instance with Basic Auth
    const credentials = Buffer.from(
      `${config.wpUsername}:${config.wpAppPassword}`
    ).toString("base64");

    this.client = axios.create({
      baseURL: `${baseURL}/wp-json/wp/v2`,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Test connection to WordPress
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/posts", { params: { per_page: 1 } });
      return response.status === 200;
    } catch (error) {
      console.error("[WordPress] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Create a new post (job) in WordPress
   */
  async createPost(job: WordPressJob): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post("/posts", {
        title: job.title,
        content: job.content,
        status: job.status || "draft",
        meta: job.meta || {},
      });

      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (error) {
      console.error("[WordPress] Failed to create post:", error);
      throw error;
    }
  }

  /**
   * Update an existing post
   */
  async updatePost(postId: number, job: Partial<WordPressJob>): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post(`/posts/${postId}`, {
        title: job.title,
        content: job.content,
        status: job.status,
        meta: job.meta || {},
      });

      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (error) {
      console.error("[WordPress] Failed to update post:", error);
      throw error;
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(postId: number): Promise<any> {
    try {
      const response = await this.client.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("[WordPress] Failed to get post:", error);
      throw error;
    }
  }

  /**
   * Search for existing posts by title
   */
  async searchPosts(title: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await this.client.get("/posts", {
        params: {
          search: title,
          per_page: limit,
        },
      });
      return response.data;
    } catch (error) {
      console.error("[WordPress] Failed to search posts:", error);
      return [];
    }
  }

  /**
   * Get all categories (taxonomies)
   */
  async getCategories(): Promise<any[]> {
    try {
      const response = await this.client.get("/categories", {
        params: { per_page: 100 },
      });
      return response.data;
    } catch (error) {
      console.error("[WordPress] Failed to get categories:", error);
      return [];
    }
  }

  /**
   * Get all posts (jobs) with pagination
   */
  async getAllPosts(page: number = 1, perPage: number = 20): Promise<{ posts: any[]; total: number; pages: number }> {
    try {
      const response = await this.client.get("/posts", {
        params: {
          page,
          per_page: perPage,
          orderby: "date",
          order: "desc",
        },
      });

      const total = parseInt(response.headers["x-wp-total"] || "0", 10);
      const pages = parseInt(response.headers["x-wp-totalpages"] || "0", 10);

      return {
        posts: response.data,
        total,
        pages,
      };
    } catch (error) {
      console.error("[WordPress] Failed to get all posts:", error);
      return { posts: [], total: 0, pages: 0 };
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: number, force: boolean = true): Promise<boolean> {
    try {
      await this.client.delete(`/posts/${postId}`, {
        params: { force },
      });
      return true;
    } catch (error) {
      console.error("[WordPress] Failed to delete post:", error);
      return false;
    }
  }

  /**
   * Upload featured image (logo)
   */
  async uploadFeaturedImage(postId: number, imageUrl: string): Promise<boolean> {
    try {
      // Download image from URL
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const fileName = imageUrl.split("/").pop() || "logo.jpg";

      // Upload to WordPress media library
      const formData = new FormData();
      formData.append("file", new Blob([imageResponse.data]), fileName);

      const credentials = Buffer.from(
        `${this.config.wpUsername}:${this.config.wpAppPassword}`
      ).toString("base64");

      const mediaResponse = await axios.post(
        `${this.config.wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Disposition": `attachment; filename="${fileName}"`,
          },
        }
      );

      // Set as featured image
      await this.client.post(`/posts/${postId}`, {
        featured_media: mediaResponse.data.id,
      });

      return true;
    } catch (error) {
      console.error("[WordPress] Failed to upload featured image:", error);
      return false;
    }
  }
}

export { WordPressClient, WordPressConfig, WordPressJob };
