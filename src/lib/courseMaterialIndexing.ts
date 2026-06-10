// =============================================================================
// courseMaterialIndexing — RAG embedding trigger business logic
// =============================================================================
//
// Domain: when a teacher uploads a course material file, the document text
// should be chunked and embedded into `course_material_embeddings` so the AI
// tutor can cite it (RAG). The `embed-course-material` Edge Function owns the
// extraction + embedding work; this helper is the single caller that wires the
// teacher material-upload flow to that function.
//
// This lives in `src/lib/` (clean-architecture: business logic, not a hook or
// component) so the material create/update hooks can call it after a successful
// write.
//
// Graceful degradation: embedding requires an embeddings provider
// (`OPENAI_API_KEY` Supabase secret, or an OpenRouter-compatible embedding
// model) configured on the Edge Function. When no provider is configured the
// function returns an error and no embeddings are populated, but the upload
// itself still succeeds and the tutor continues to answer from persona + CLO
// context. This call is therefore fire-and-forget: errors are caught and logged
// (never thrown) so the upload UX is never blocked on indexing.

import { supabase } from "@/lib/supabase";

// The embed-course-material function can only extract text from these formats.
// Other uploads (images, video, slides binaries, archives) are skipped so we do
// not generate guaranteed `indexing_failed` rows + teacher notifications.
const SUPPORTED_INDEX_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;

// material_type values accepted by the embed-course-material EmbedRequest.
type EmbedMaterialType =
  | "lecture_notes"
  | "slides"
  | "assignment_description"
  | "rubric_criteria"
  | "other";

export interface IndexCourseMaterialParams {
  /** Storage path within the `course-materials` bucket (the uploaded file). */
  filePath: string;
  /** The course the material belongs to. */
  courseId: string;
  /** The created/updated `course_materials` row id (for re-index dedupe). */
  sourceMaterialId: string;
  /** CLOs linked to the material, used for RAG scoping. */
  cloIds?: string[];
  /** When true, instruct the function to delete prior chunks before re-indexing. */
  reindex?: boolean;
}

export interface IndexCourseMaterialResult {
  /** True when an embedding request was dispatched (supported, non-empty path). */
  dispatched: boolean;
  /** Reason indexing was skipped, when `dispatched` is false. */
  skippedReason?: "no_file_path" | "no_course_id" | "unsupported_format";
}

/** Lower-cased file extension (without the dot) derived from a storage path. */
const extensionOf = (path: string): string =>
  path.split(".").pop()?.toLowerCase() ?? "";

/** Filename portion of a storage path, used by the function for format sniffing. */
const filenameOf = (path: string): string => path.split("/").pop() ?? path;

/**
 * Fires the `embed-course-material` Edge Function for a freshly uploaded course
 * material file, when the file format is text-extractable.
 *
 * Fire-and-forget: never throws. Returns a result so callers can observe
 * whether a request was dispatched without having to handle errors.
 */
export const indexCourseMaterialIfSupported = async (
  params: IndexCourseMaterialParams
): Promise<IndexCourseMaterialResult> => {
  const { filePath, courseId, sourceMaterialId, cloIds, reindex } = params;

  if (!filePath) {
    return { dispatched: false, skippedReason: "no_file_path" };
  }
  if (!courseId) {
    return { dispatched: false, skippedReason: "no_course_id" };
  }

  const ext = extensionOf(filePath);
  if (
    !SUPPORTED_INDEX_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_INDEX_EXTENSIONS)[number]
    )
  ) {
    return { dispatched: false, skippedReason: "unsupported_format" };
  }

  const materialType: EmbedMaterialType = "lecture_notes";

  try {
    const { error } = await supabase.functions.invoke("embed-course-material", {
      body: {
        file_url: filePath,
        course_id: courseId,
        clo_ids: cloIds ?? [],
        material_type: materialType,
        source_filename: filenameOf(filePath),
        source_material_id: sourceMaterialId,
        reindex: reindex === true,
      },
    });

    if (error) {
      // Non-fatal: provider may be unconfigured or extraction may fail. The
      // upload already succeeded; the tutor degrades gracefully without RAG.
      console.error(
        "[indexCourseMaterialIfSupported] embed-course-material invocation returned an error:",
        error.message
      );
    }
  } catch (err) {
    console.error(
      "[indexCourseMaterialIfSupported] embed-course-material invocation failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  return { dispatched: true };
};
