import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required").max(200),
  category: z.enum(["all", "courses", "assignments", "students", "announcements", "materials"]).default("all"),
  limit: z.number().int().min(1).max(50).default(10),
});

export const searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string().optional(),
  url: z.string(),
});

export type SearchQueryFormData = z.infer<typeof searchQuerySchema>;
export type SearchResultData = z.infer<typeof searchResultSchema>;
