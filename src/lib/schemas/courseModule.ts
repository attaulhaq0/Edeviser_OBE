import { z } from "zod";

export const createModuleSchema = z.object({
  course_id: z.uuid(),
  title: z.string().min(1, "Module title is required").max(255),
  description: z.string().optional(),
  sort_order: z.number().int().min(0),
  is_published: z.boolean().default(false),
});

export const createMaterialSchema = z.object({
  module_id: z.uuid(),
  title: z.string().min(1, "Material title is required").max(255),
  type: z.enum(["file", "link", "video", "text"]),
  content_url: z.string().url().optional(),
  file_path: z.string().optional(),
  description: z.string().optional(),
  sort_order: z.number().int().min(0),
  is_published: z.boolean().default(false),
  clo_ids: z.array(z.uuid()).optional(),
});

export type CreateModuleFormData = z.infer<typeof createModuleSchema>;
export type CreateMaterialFormData = z.infer<typeof createMaterialSchema>;
