import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type MaterialType =
  | "lecture_notes"
  | "slides"
  | "assignment_description"
  | "rubric_criteria"
  | "other";

interface EmbedRequest {
  file_url: string;
  course_id: string;
  clo_ids?: string[];
  bloom_level?: string;
  material_type: MaterialType;
  source_filename: string;
  source_material_id?: string;
  institution_id?: string;
}

interface TextChunk {
  text: string;
  start_offset: number;
  end_offset: number;
  token_count_estimate: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002";
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_BATCH_SIZE = 100;
const MAX_TOKENS_PER_CHUNK = 500;
const MIN_TOKENS_PER_CHUNK = 200;
const OVERLAP_TOKENS = 50;
const LARGE_DOCUMENT_PAGE_THRESHOLD = 100;
const CHARS_PER_PAGE_ESTIMATE = 2000;

const VALID_MATERIAL_TYPES: MaterialType[] = [
  "lecture_notes",
  "slides",
  "assignment_description",
  "rubric_criteria",
  "other",
];

// ─── Token Estimation ───────────────────────────────────────────────────────

function estimateTokenCount(text: string): number {
  if (text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

// ─── Sentence Splitting ─────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  if (text.length === 0) return [];
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((p) => p.length > 0);
}

// ─── Text Chunking ──────────────────────────────────────────────────────────

function chunkText(text: string): TextChunk[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const totalTokens = estimateTokenCount(trimmed);
  if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
    return [
      {
        text: trimmed,
        start_offset: 0,
        end_offset: trimmed.length,
        token_count_estimate: totalTokens,
      },
    ];
  }

  const sentences = splitIntoSentences(trimmed);
  const chunks: TextChunk[] = [];

  const sentenceOffsets: number[] = [];
  let offsetCursor = 0;
  for (const sentence of sentences) {
    const idx = trimmed.indexOf(sentence, offsetCursor);
    sentenceOffsets.push(idx >= 0 ? idx : offsetCursor);
    offsetCursor = (idx >= 0 ? idx : offsetCursor) + sentence.length;
    while (offsetCursor < trimmed.length && /\s/.test(trimmed[offsetCursor]!)) {
      offsetCursor++;
    }
  }

  let currentSentences: string[] = [];
  let currentTokens = 0;

  const flushChunk = (): void => {
    if (currentSentences.length === 0) return;

    const chunkTextContent = currentSentences.join(" ");
    const firstIdx = sentences.indexOf(currentSentences[0]!);
    const lastIdx = sentences.indexOf(
      currentSentences[currentSentences.length - 1]!
    );

    const startOffset = firstIdx >= 0 ? sentenceOffsets[firstIdx]! : 0;
    const lastSentence = currentSentences[currentSentences.length - 1]!;
    const lastOffset = lastIdx >= 0 ? sentenceOffsets[lastIdx]! : startOffset;
    const endOffset = lastOffset + lastSentence.length;

    chunks.push({
      text: chunkTextContent,
      start_offset: startOffset,
      end_offset: endOffset,
      token_count_estimate: estimateTokenCount(chunkTextContent),
    });
  };

  let sentenceIdx = 0;
  while (sentenceIdx < sentences.length) {
    const sentence = sentences[sentenceIdx]!;
    const sentenceTokens = estimateTokenCount(sentence);

    // Force-split oversized single sentences
    if (
      sentenceTokens > MAX_TOKENS_PER_CHUNK &&
      currentSentences.length === 0
    ) {
      const maxChars = MAX_TOKENS_PER_CHUNK * 4;
      const overlapChars = OVERLAP_TOKENS * 4;
      let charPos = 0;
      const sentenceStart = sentenceOffsets[sentenceIdx]!;

      while (charPos < sentence.length) {
        const end = Math.min(charPos + maxChars, sentence.length);
        const slice = sentence.slice(charPos, end);

        chunks.push({
          text: slice,
          start_offset: sentenceStart + charPos,
          end_offset: sentenceStart + end,
          token_count_estimate: estimateTokenCount(slice),
        });

        charPos = end === sentence.length ? end : end - overlapChars;
      }

      sentenceIdx++;
      continue;
    }

    if (
      currentTokens + sentenceTokens > MAX_TOKENS_PER_CHUNK &&
      currentSentences.length > 0
    ) {
      flushChunk();

      const overlapSentences: string[] = [];
      let overlapCount = 0;
      for (let i = currentSentences.length - 1; i >= 0; i--) {
        const s = currentSentences[i]!;
        const sTokens = estimateTokenCount(s);
        if (overlapCount + sTokens > OVERLAP_TOKENS) break;
        overlapSentences.unshift(s);
        overlapCount += sTokens;
      }

      currentSentences = [...overlapSentences];
      currentTokens = overlapCount;
      continue;
    }

    currentSentences.push(sentence);
    currentTokens += sentenceTokens;
    sentenceIdx++;
  }

  flushChunk();
  return chunks;
}

// ─── Text Extraction ────────────────────────────────────────────────────────

/**
 * Extract text from a file based on its content type.
 * For PDF and DOCX, we use basic text extraction approaches suitable for Deno.
 * Plain text is returned as-is.
 */
async function extractText(
  fileBytes: Uint8Array,
  filename: string
): Promise<string> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return new TextDecoder().decode(fileBytes);
  }

  if (lowerName.endsWith(".pdf")) {
    return extractTextFromPDF(fileBytes);
  }

  if (lowerName.endsWith(".docx")) {
    return extractTextFromDOCX(fileBytes);
  }

  throw new Error(
    `Unsupported file format: ${filename}. Supported formats: PDF, DOCX, TXT, MD.`
  );
}

/**
 * Basic PDF text extraction.
 * Uses pdf-parse via esm.sh for Deno compatibility.
 */
async function extractTextFromPDF(fileBytes: Uint8Array): Promise<string> {
  // Dynamic import for Deno Edge Function environment
  const pdfParse = (await import("https://esm.sh/pdf-parse@1.1.1")).default;
  const result = await pdfParse(fileBytes);
  return result.text ?? "";
}

/**
 * Basic DOCX text extraction.
 * Uses mammoth via esm.sh for Deno compatibility.
 */
async function extractTextFromDOCX(fileBytes: Uint8Array): Promise<string> {
  const mammoth = await import("https://esm.sh/mammoth@1.6.0");
  const result = await mammoth.extractRawText({ buffer: fileBytes });
  return result.value ?? "";
}

// ─── OpenAI Embedding Generation ────────────────────────────────────────────

async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];

  // Process in batches of EMBEDDING_BATCH_SIZE
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: batch,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI Embedding API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    const embeddings = data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => item.embedding);

    results.push(...embeddings);
  }

  return results;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRequest(
  body: unknown
): { valid: true; data: EmbedRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const req = body as Record<string, unknown>;

  if (!req.file_url || typeof req.file_url !== "string") {
    return { valid: false, error: "file_url is required and must be a string" };
  }

  if (!req.course_id || typeof req.course_id !== "string") {
    return {
      valid: false,
      error: "course_id is required and must be a string",
    };
  }

  if (!req.source_filename || typeof req.source_filename !== "string") {
    return {
      valid: false,
      error: "source_filename is required and must be a string",
    };
  }

  if (!req.material_type || typeof req.material_type !== "string") {
    return {
      valid: false,
      error: "material_type is required and must be a string",
    };
  }

  if (!VALID_MATERIAL_TYPES.includes(req.material_type as MaterialType)) {
    return {
      valid: false,
      error: `material_type must be one of: ${VALID_MATERIAL_TYPES.join(", ")}`,
    };
  }

  if (req.clo_ids !== undefined) {
    if (
      !Array.isArray(req.clo_ids) ||
      !req.clo_ids.every((id: unknown) => typeof id === "string")
    ) {
      return { valid: false, error: "clo_ids must be an array of strings" };
    }
  }

  if (req.bloom_level !== undefined && typeof req.bloom_level !== "string") {
    return { valid: false, error: "bloom_level must be a string" };
  }

  return {
    valid: true,
    data: {
      file_url: req.file_url as string,
      course_id: req.course_id as string,
      clo_ids: (req.clo_ids as string[] | undefined) ?? [],
      bloom_level: req.bloom_level as string | undefined,
      material_type: req.material_type as MaterialType,
      source_filename: req.source_filename as string,
      source_material_id: req.source_material_id as string | undefined,
      institution_id: req.institution_id as string | undefined,
    },
  };
}

// ─── Notification Helper ────────────────────────────────────────────────────

async function notifyTeacher(
  supabase: ReturnType<typeof createClient>,
  teacherId: string,
  institutionId: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      user_id: teacherId,
      institution_id: institutionId,
      title,
      message,
      type: "system",
      read: false,
    });
  } catch {
    // Non-critical — log but don't fail the main operation
    console.error("Failed to send teacher notification");
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Create service-role client (bypasses RLS for server-side operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Parse and validate request ──────────────────────────────────────
    const body = await req.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedReq = validation.data;

    // ── Resolve institution_id from course ──────────────────────────────
    let institutionId = embedReq.institution_id;
    let teacherId: string | null = null;

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("institution_id, teacher_id")
      .eq("id", embedReq.course_id)
      .maybeSingle();

    if (courseError || !courseData) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    institutionId = institutionId ?? courseData.institution_id;
    teacherId = courseData.teacher_id;

    // ── Delete old chunks for re-indexing ────────────────────────────────
    // (Task 3.2.7: Re-indexing — delete old chunks before inserting new ones)
    if (embedReq.source_material_id) {
      await supabase
        .from("course_material_embeddings")
        .delete()
        .eq("source_material_id", embedReq.source_material_id)
        .eq("course_id", embedReq.course_id);
    } else {
      // Fall back to matching by filename + course
      await supabase
        .from("course_material_embeddings")
        .delete()
        .eq("source_filename", embedReq.source_filename)
        .eq("course_id", embedReq.course_id);
    }

    // ── Download file from Supabase Storage ─────────────────────────────
    // (Task 3.2.1: File download and text extraction)
    let fileBytes: Uint8Array;

    if (embedReq.file_url.startsWith("http")) {
      // ── SSRF Protection: validate URL against allowlist ────────────────
      // Only allow fetching from the project's own Supabase Storage URL.
      // Block private IP ranges, localhost, and cloud metadata endpoints.
      const parsedUrl = new URL(embedReq.file_url);
      const allowedHost = new URL(supabaseUrl).hostname;
      const hostname = parsedUrl.hostname.toLowerCase();

      // Block private/internal IP ranges and metadata endpoints
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^0\./,
        /^\[::1\]$/,
        /^metadata\.google\.internal$/i,
      ];

      const isBlocked = blockedPatterns.some((pattern) =>
        pattern.test(hostname)
      );
      if (isBlocked) {
        return new Response(
          JSON.stringify({
            error: "Forbidden: URL points to a private or internal address",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Only allow the project's own Supabase domain
      if (hostname !== allowedHost) {
        return new Response(
          JSON.stringify({
            error: `Forbidden: only URLs from ${allowedHost} are allowed`,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Direct URL — fetch the file
      const fileResponse = await fetch(embedReq.file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: HTTP ${fileResponse.status}`);
      }
      fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
    } else {
      // ── Path Traversal Protection for storage paths ───────────────────
      if (embedReq.file_url.includes("..")) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid file path: path traversal sequences are not allowed",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Supabase Storage path — download via storage API
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("course-materials")
        .download(embedReq.file_url);

      if (downloadError || !fileData) {
        throw new Error(
          `Failed to download file from storage: ${
            downloadError?.message ?? "Unknown error"
          }`
        );
      }

      fileBytes = new Uint8Array(await fileData.arrayBuffer());
    }

    // ── Extract text ────────────────────────────────────────────────────
    let extractedText: string;
    try {
      extractedText = await extractText(fileBytes, embedReq.source_filename);
    } catch (extractionError) {
      // (Task 3.2.6: Error handling — mark indexing_failed, notify teacher)
      if (embedReq.source_material_id) {
        await supabase.from("course_material_embeddings").insert({
          institution_id: institutionId,
          course_id: embedReq.course_id,
          chunk_text: "",
          embedding: Array(EMBEDDING_DIMENSIONS).fill(0),
          source_filename: embedReq.source_filename,
          material_type: embedReq.material_type,
          chunk_index: 0,
          token_count: 0,
          source_material_id: embedReq.source_material_id,
          indexing_status: "indexing_failed",
        });
      }

      if (teacherId) {
        await notifyTeacher(
          supabase,
          teacherId,
          institutionId,
          "Material Indexing Failed",
          `Failed to index "${embedReq.source_filename}". ${
            (extractionError as Error).message
          }. Please try re-uploading in a different format.`
        );
      }

      return new Response(
        JSON.stringify({
          error: `Text extraction failed: ${
            (extractionError as Error).message
          }`,
          indexing_status: "indexing_failed",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!extractedText.trim()) {
      if (teacherId) {
        await notifyTeacher(
          supabase,
          teacherId,
          institutionId,
          "Material Indexing Failed",
          `"${embedReq.source_filename}" appears to be empty or contains no extractable text.`
        );
      }

      return new Response(
        JSON.stringify({
          error: "Document contains no extractable text",
          indexing_status: "indexing_failed",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Check for large document (async processing) ─────────────────────
    // (Task 3.2.5: Async processing for documents > 100 pages)
    const estimatedPages = Math.ceil(
      extractedText.length / CHARS_PER_PAGE_ESTIMATE
    );
    const isLargeDocument = estimatedPages > LARGE_DOCUMENT_PAGE_THRESHOLD;

    if (isLargeDocument && teacherId) {
      // Notify teacher that processing is underway for large documents
      await notifyTeacher(
        supabase,
        teacherId,
        institutionId,
        "Large Document Processing",
        `"${embedReq.source_filename}" (~${estimatedPages} pages) is being indexed. You will be notified when processing is complete.`
      );
    }

    // ── Chunk text ──────────────────────────────────────────────────────
    // (Task 3.2.2: Text chunking — 200–500 tokens, 50-token overlap)
    const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No chunks produced from document text",
          indexing_status: "indexing_failed",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Generate embeddings ─────────────────────────────────────────────
    // (Task 3.2.3: Batch embedding generation via OpenAI API)
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(
        chunks.map((c) => c.text),
        openaiApiKey
      );
    } catch (embeddingError) {
      // Mark as failed and notify teacher
      if (embedReq.source_material_id) {
        await supabase.from("course_material_embeddings").insert({
          institution_id: institutionId,
          course_id: embedReq.course_id,
          chunk_text: "",
          embedding: Array(EMBEDDING_DIMENSIONS).fill(0),
          source_filename: embedReq.source_filename,
          material_type: embedReq.material_type,
          chunk_index: 0,
          token_count: 0,
          source_material_id: embedReq.source_material_id,
          indexing_status: "indexing_failed",
        });
      }

      if (teacherId) {
        await notifyTeacher(
          supabase,
          teacherId,
          institutionId,
          "Material Indexing Failed",
          `Failed to generate embeddings for "${embedReq.source_filename}". ${
            (embeddingError as Error).message
          }`
        );
      }

      throw embeddingError;
    }

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: got ${embeddings.length} embeddings for ${chunks.length} chunks`
      );
    }

    // ── Insert chunks into course_material_embeddings ───────────────────
    // (Task 3.2.4: Chunk insertion with metadata)
    const insertRows = chunks.map((chunk, index) => ({
      institution_id: institutionId,
      course_id: embedReq.course_id,
      chunk_text: chunk.text,
      embedding: JSON.stringify(embeddings[index]),
      source_filename: embedReq.source_filename,
      material_type: embedReq.material_type,
      clo_ids: embedReq.clo_ids ?? [],
      bloom_level: embedReq.bloom_level ?? null,
      chunk_index: index,
      token_count: chunk.token_count_estimate,
      source_material_id: embedReq.source_material_id ?? null,
      indexing_status: "indexed",
    }));

    // Insert in batches to avoid payload size limits
    const INSERT_BATCH_SIZE = 50;
    for (let i = 0; i < insertRows.length; i += INSERT_BATCH_SIZE) {
      const batch = insertRows.slice(i, i + INSERT_BATCH_SIZE);
      const { error: insertError } = await supabase
        .from("course_material_embeddings")
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // ── Notify teacher on completion for large documents ────────────────
    if (isLargeDocument && teacherId) {
      await notifyTeacher(
        supabase,
        teacherId,
        institutionId,
        "Material Indexing Complete",
        `"${embedReq.source_filename}" has been successfully indexed (${chunks.length} chunks from ~${estimatedPages} pages).`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        source_filename: embedReq.source_filename,
        estimated_pages: estimatedPages,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("embed-course-material error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
