import { describe, it, expect } from "vitest";

// ─── Replicate pure helpers from the Edge Function for unit testing ──────────
// Edge Functions run on Deno and can't be imported directly in Vitest.
// We test the core logic by replicating the pure functions here.

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
  reindex?: boolean;
}

interface AutoIndexRequest {
  course_id: string;
  clo_ids?: string[];
  bloom_level?: string;
  material_type: "assignment_description" | "rubric_criteria";
  source_filename: string;
  source_material_id?: string;
  institution_id?: string;
  title: string;
  description?: string;
  rubric_criteria?: Array<{ criterion: string; description?: string }>;
  assignment_id?: string;
}

interface TextChunk {
  text: string;
  start_offset: number;
  end_offset: number;
  token_count_estimate: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TOKENS_PER_CHUNK = 500;
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

// ─── Replicated Pure Functions ──────────────────────────────────────────────

function estimateTokenCount(text: string): number {
  if (text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitIntoSentences(text: string): string[] {
  if (text.length === 0) return [];
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((p) => p.length > 0);
}

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
      reindex: req.reindex === true,
    },
  };
}

function validateAutoIndexRequest(
  body: unknown
): { valid: true; data: AutoIndexRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const req = body as Record<string, unknown>;

  if (!req.course_id || typeof req.course_id !== "string") {
    return {
      valid: false,
      error: "course_id is required and must be a string",
    };
  }

  if (!req.title || typeof req.title !== "string") {
    return { valid: false, error: "title is required and must be a string" };
  }

  if (!req.material_type || typeof req.material_type !== "string") {
    return {
      valid: false,
      error: "material_type is required and must be a string",
    };
  }

  const validAutoTypes: MaterialType[] = [
    "assignment_description",
    "rubric_criteria",
  ];
  if (!validAutoTypes.includes(req.material_type as MaterialType)) {
    return {
      valid: false,
      error: `material_type for auto-indexing must be one of: ${validAutoTypes.join(
        ", "
      )}`,
    };
  }

  if (!req.source_filename || typeof req.source_filename !== "string") {
    return {
      valid: false,
      error: "source_filename is required and must be a string",
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

  if (req.description !== undefined && typeof req.description !== "string") {
    return { valid: false, error: "description must be a string" };
  }

  if (req.rubric_criteria !== undefined) {
    if (!Array.isArray(req.rubric_criteria)) {
      return { valid: false, error: "rubric_criteria must be an array" };
    }
    for (const criterion of req.rubric_criteria) {
      if (
        !criterion ||
        typeof criterion !== "object" ||
        typeof (criterion as Record<string, unknown>).criterion !== "string"
      ) {
        return {
          valid: false,
          error:
            "Each rubric_criteria item must have a 'criterion' string field",
        };
      }
    }
  }

  return {
    valid: true,
    data: {
      course_id: req.course_id as string,
      clo_ids: (req.clo_ids as string[] | undefined) ?? [],
      bloom_level: req.bloom_level as string | undefined,
      material_type: req.material_type as
        | "assignment_description"
        | "rubric_criteria",
      source_filename: req.source_filename as string,
      source_material_id: req.source_material_id as string | undefined,
      institution_id: req.institution_id as string | undefined,
      title: req.title as string,
      description: req.description as string | undefined,
      rubric_criteria: req.rubric_criteria as
        | Array<{ criterion: string; description?: string }>
        | undefined,
      assignment_id: req.assignment_id as string | undefined,
    },
  };
}

function assembleAutoIndexText(req: AutoIndexRequest): string {
  const sections: string[] = [];

  sections.push(req.title);

  if (req.description?.trim()) {
    sections.push(req.description.trim());
  }

  if (req.rubric_criteria && req.rubric_criteria.length > 0) {
    const criteriaLines = req.rubric_criteria.map((rc) => {
      if (rc.description?.trim()) {
        return `${rc.criterion}: ${rc.description.trim()}`;
      }
      return rc.criterion;
    });
    sections.push("Rubric Criteria:\n" + criteriaLines.join("\n"));
  }

  return sections.join("\n\n");
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("embed-course-material: Token Estimation", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("estimates tokens as ceil(length / 4)", () => {
    expect(estimateTokenCount("hello")).toBe(2); // ceil(5/4) = 2
    expect(estimateTokenCount("abcd")).toBe(1); // ceil(4/4) = 1
    expect(estimateTokenCount("a")).toBe(1); // max(1, ceil(1/4)) = 1
  });

  it("returns at least 1 for non-empty text", () => {
    expect(estimateTokenCount("x")).toBeGreaterThanOrEqual(1);
  });
});

describe("embed-course-material: Sentence Splitting", () => {
  it("returns empty array for empty string", () => {
    expect(splitIntoSentences("")).toEqual([]);
  });

  it("splits on sentence-ending punctuation", () => {
    const result = splitIntoSentences("Hello world. How are you? Fine!");
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Hello world.");
    expect(result[1]).toBe("How are you?");
    expect(result[2]).toBe("Fine!");
  });

  it("handles text without sentence endings", () => {
    const result = splitIntoSentences("No punctuation here");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("No punctuation here");
  });
});

describe("embed-course-material: Text Chunking (3.2.2)", () => {
  it("returns empty array for empty text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const text = "This is a short text.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe(text);
    // TextChunk uses start_offset, not chunk_index
    expect("chunk_index" in chunks[0]!).toBe(false);
    expect(chunks[0]!.token_count_estimate).toBeGreaterThan(0);
  });

  it("produces multiple chunks for long text", () => {
    // Generate text that exceeds MAX_TOKENS_PER_CHUNK (500 tokens ≈ 2000 chars)
    const sentences = Array.from(
      { length: 50 },
      (_, i) =>
        `This is sentence number ${
          i + 1
        } which contains some meaningful content about the topic.`
    );
    const text = sentences.join(" ");
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should have valid token count
    for (const chunk of chunks) {
      expect(chunk.token_count_estimate).toBeGreaterThan(0);
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });

  it("chunk token counts do not exceed MAX_TOKENS_PER_CHUNK", () => {
    const sentences = Array.from(
      { length: 80 },
      (_, i) =>
        `Sentence ${
          i + 1
        } discusses important concepts in computer science and mathematics.`
    );
    const text = sentences.join(" ");
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      // Allow small overflow due to sentence boundary preservation
      expect(chunk.token_count_estimate).toBeLessThanOrEqual(
        MAX_TOKENS_PER_CHUNK + 50
      );
    }
  });

  it("preserves all text content across chunks", () => {
    const sentences = Array.from(
      { length: 30 },
      (_, i) => `Point ${i + 1} is about learning outcomes.`
    );
    const text = sentences.join(" ");
    const chunks = chunkText(text);

    // Every sentence should appear in at least one chunk
    for (const sentence of sentences) {
      const found = chunks.some((c) => c.text.includes(sentence));
      expect(found).toBe(true);
    }
  });
});

describe("embed-course-material: Request Validation (3.2.1)", () => {
  const validRequest = {
    file_url: "https://example.com/file.pdf",
    course_id: "course-123",
    source_filename: "lecture.pdf",
    material_type: "lecture_notes",
  };

  it("accepts a valid request", () => {
    const result = validateRequest(validRequest);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.file_url).toBe(validRequest.file_url);
      expect(result.data.course_id).toBe(validRequest.course_id);
      expect(result.data.material_type).toBe("lecture_notes");
    }
  });

  it("rejects null body", () => {
    const result = validateRequest(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing file_url", () => {
    const result = validateRequest({
      course_id: "c1",
      source_filename: "f.pdf",
      material_type: "other",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("file_url");
  });

  it("rejects missing course_id", () => {
    const result = validateRequest({
      file_url: "url",
      source_filename: "f.pdf",
      material_type: "other",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("course_id");
  });

  it("rejects missing source_filename", () => {
    const result = validateRequest({
      file_url: "url",
      course_id: "c1",
      material_type: "other",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("source_filename");
  });

  it("rejects invalid material_type", () => {
    const result = validateRequest({
      ...validRequest,
      material_type: "invalid_type",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("material_type");
  });

  it("accepts all valid material types", () => {
    for (const mt of VALID_MATERIAL_TYPES) {
      const result = validateRequest({ ...validRequest, material_type: mt });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects non-array clo_ids", () => {
    const result = validateRequest({ ...validRequest, clo_ids: "not-array" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("clo_ids");
  });

  it("rejects clo_ids with non-string elements", () => {
    const result = validateRequest({ ...validRequest, clo_ids: [123] });
    expect(result.valid).toBe(false);
  });

  it("accepts optional clo_ids array", () => {
    const result = validateRequest({
      ...validRequest,
      clo_ids: ["clo-1", "clo-2"],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.clo_ids).toEqual(["clo-1", "clo-2"]);
    }
  });

  it("defaults clo_ids to empty array when not provided", () => {
    const result = validateRequest(validRequest);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.clo_ids).toEqual([]);
    }
  });

  it("parses reindex flag correctly", () => {
    const result = validateRequest({ ...validRequest, reindex: true });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.reindex).toBe(true);
    }
  });

  it("defaults reindex to false", () => {
    const result = validateRequest(validRequest);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.reindex).toBe(false);
    }
  });
});

describe("embed-course-material: Auto-Index Validation (3.2.8)", () => {
  const validAutoRequest = {
    course_id: "course-123",
    title: "Assignment 1: Data Structures",
    material_type: "assignment_description",
    source_filename: "assignment-1",
  };

  it("accepts a valid auto-index request", () => {
    const result = validateAutoIndexRequest(validAutoRequest);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.title).toBe(validAutoRequest.title);
      expect(result.data.material_type).toBe("assignment_description");
    }
  });

  it("rejects missing title", () => {
    const { title, ...noTitle } = validAutoRequest;
    void title; // intentionally omitted from noTitle
    const result = validateAutoIndexRequest(noTitle);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("title");
  });

  it("rejects missing course_id", () => {
    const { course_id, ...noCourse } = validAutoRequest;
    void course_id; // intentionally omitted from noCourse
    const result = validateAutoIndexRequest(noCourse);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("course_id");
  });

  it("rejects invalid material_type for auto-indexing", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      material_type: "lecture_notes",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("material_type");
  });

  it("accepts rubric_criteria material type", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      material_type: "rubric_criteria",
    });
    expect(result.valid).toBe(true);
  });

  it("accepts optional description", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      description: "Implement a binary search tree.",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.description).toBe("Implement a binary search tree.");
    }
  });

  it("rejects non-string description", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      description: 123,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("description");
  });

  it("accepts valid rubric_criteria array", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      rubric_criteria: [
        {
          criterion: "Correctness",
          description: "Code produces correct output",
        },
        { criterion: "Style" },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.rubric_criteria).toHaveLength(2);
    }
  });

  it("rejects rubric_criteria with missing criterion field", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      rubric_criteria: [{ description: "Missing criterion field" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("criterion");
  });

  it("rejects non-array rubric_criteria", () => {
    const result = validateAutoIndexRequest({
      ...validAutoRequest,
      rubric_criteria: "not-array",
    });
    expect(result.valid).toBe(false);
  });
});

describe("embed-course-material: Auto-Index Text Assembly (3.2.8)", () => {
  it("assembles text from title only", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Assignment 1",
      material_type: "assignment_description",
      source_filename: "a1",
    });
    expect(result).toBe("Assignment 1");
  });

  it("assembles text from title and description", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Assignment 1",
      description: "Implement a linked list.",
      material_type: "assignment_description",
      source_filename: "a1",
    });
    expect(result).toContain("Assignment 1");
    expect(result).toContain("Implement a linked list.");
  });

  it("assembles text from title, description, and rubric criteria", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Final Project",
      description: "Build a web application.",
      material_type: "assignment_description",
      source_filename: "fp",
      rubric_criteria: [
        { criterion: "Functionality", description: "App works correctly" },
        { criterion: "Design", description: "Clean UI" },
      ],
    });
    expect(result).toContain("Final Project");
    expect(result).toContain("Build a web application.");
    expect(result).toContain("Rubric Criteria:");
    expect(result).toContain("Functionality: App works correctly");
    expect(result).toContain("Design: Clean UI");
  });

  it("handles rubric criteria without descriptions", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Quiz 1",
      material_type: "rubric_criteria",
      source_filename: "q1",
      rubric_criteria: [
        { criterion: "Accuracy" },
        { criterion: "Completeness" },
      ],
    });
    expect(result).toContain("Accuracy");
    expect(result).toContain("Completeness");
    // Criteria without descriptions should not have "criterion: description" format
    expect(result).not.toContain("Accuracy:");
    expect(result).not.toContain("Completeness:");
  });

  it("skips empty description", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Test",
      description: "   ",
      material_type: "assignment_description",
      source_filename: "t",
    });
    expect(result).toBe("Test");
  });

  it("skips empty rubric_criteria array", () => {
    const result = assembleAutoIndexText({
      course_id: "c1",
      title: "Test",
      material_type: "assignment_description",
      source_filename: "t",
      rubric_criteria: [],
    });
    expect(result).toBe("Test");
  });
});

describe("embed-course-material: Large Document Detection (3.2.5)", () => {
  it("detects documents over 100 pages", () => {
    // 100 pages * 2000 chars/page = 200,000 chars
    const largeText = "x".repeat(200_001);
    const estimatedPages = Math.ceil(
      largeText.length / CHARS_PER_PAGE_ESTIMATE
    );
    expect(estimatedPages).toBeGreaterThan(LARGE_DOCUMENT_PAGE_THRESHOLD);
  });

  it("does not flag small documents", () => {
    const smallText = "x".repeat(1000);
    const estimatedPages = Math.ceil(
      smallText.length / CHARS_PER_PAGE_ESTIMATE
    );
    expect(estimatedPages).toBeLessThanOrEqual(LARGE_DOCUMENT_PAGE_THRESHOLD);
  });
});
