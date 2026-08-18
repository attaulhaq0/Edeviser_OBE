import { describe, expect, it } from "vitest";

import {
  MULTILINGUAL_RETRIEVAL_FIXTURES,
  evaluateRetrievalBenchmark,
} from "@/lib/multilingualRetrievalBenchmark";

describe("multilingual retrieval benchmark fixtures", () => {
  it("contains English, Arabic, cross-language, mixed, and negative cases", () => {
    const fixture = MULTILINGUAL_RETRIEVAL_FIXTURES[0];
    expect(fixture?.queries.map((query) => query.id)).toEqual([
      "en-to-en",
      "ar-to-ar",
      "en-to-ar",
      "ar-to-en",
      "mixed-query",
      "parent-negative",
      "unenrolled-negative",
    ]);
  });

  it("records a correct authorized ranking and rejects an unauthorized leak", () => {
    const fixture = MULTILINGUAL_RETRIEVAL_FIXTURES[0];
    const authorized = fixture?.queries[0];
    expect(authorized).toBeDefined();
    expect(
      evaluateRetrievalBenchmark({
        query: authorized!,
        rankedDocumentIds: ["en-course-a-outcome", "unrelated-course-a"],
        authorizedDocumentIds: new Set([
          "en-course-a-outcome",
          "unrelated-course-a",
        ]),
      })
    ).toMatchObject({
      topResultCorrect: true,
      reciprocalRank: 1,
      citationCorrect: true,
      unauthorizedLeak: false,
    });

    const negative = fixture?.queries[5];
    expect(negative).toBeDefined();
    expect(
      evaluateRetrievalBenchmark({
        query: negative!,
        rankedDocumentIds: ["same-topic-institution-b"],
        authorizedDocumentIds: new Set(["en-course-a-outcome"]),
      })
    ).toMatchObject({
      topResultCorrect: false,
      citationCorrect: false,
      unauthorizedLeak: true,
    });
  });
});

