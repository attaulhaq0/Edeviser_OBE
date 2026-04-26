import { describe, it, expect } from 'vitest';
import {
  assembleSystemPrompt,
  buildCLOContext,
  buildChunkContext,
  getPersonaPrompt,
  getAutonomyPrompt,
  formatConversationHistory,
  containsPII,
  stripPII,
  type CLOAttainment,
  type RAGChunk,
} from '@/lib/tutorPrompt';

// ─── buildCLOContext edge cases ─────────────────────────────────────────────

describe('buildCLOContext', () => {
  it('returns "no data" message for empty CLO list', () => {
    const result = buildCLOContext([]);
    expect(result).toContain('No CLO attainment data is available');
  });

  it('includes competency gap section when gaps exist', () => {
    const clos: CLOAttainment[] = [
      { clo_id: '1', clo_title: 'Algorithms', bloom_level: 'Applying', attainment_percent: 45 },
      { clo_id: '2', clo_title: 'Data Structures', bloom_level: 'Understanding', attainment_percent: 80 },
    ];
    const result = buildCLOContext(clos);
    expect(result).toContain('Competency Gaps');
    expect(result).toContain('Algorithms');
    expect(result).toContain('45%');
    expect(result).toContain('[COMPETENCY GAP]');
  });

  it('does not include gap section when all CLOs are above 70%', () => {
    const clos: CLOAttainment[] = [
      { clo_id: '1', clo_title: 'Algorithms', bloom_level: 'Applying', attainment_percent: 85 },
      { clo_id: '2', clo_title: 'Data Structures', bloom_level: 'Understanding', attainment_percent: 72 },
    ];
    const result = buildCLOContext(clos);
    expect(result).not.toContain('Competency Gaps');
  });
});

// ─── buildChunkContext edge cases ───────────────────────────────────────────

describe('buildChunkContext', () => {
  it('returns "no materials" message for empty chunks', () => {
    const result = buildChunkContext([]);
    expect(result).toContain('No relevant course materials were found');
  });

  it('numbers chunks sequentially starting from [1]', () => {
    const chunks: RAGChunk[] = [
      { chunk_id: '1', chunk_text: 'First chunk content', source_filename: 'lecture.pdf', material_type: 'lecture_notes', similarity_score: 0.9 },
      { chunk_id: '2', chunk_text: 'Second chunk content', source_filename: 'slides.pdf', material_type: 'slides', similarity_score: 0.85 },
    ];
    const result = buildChunkContext(chunks);
    expect(result).toContain('[1] Source: lecture.pdf');
    expect(result).toContain('[2] Source: slides.pdf');
    expect(result).toContain('First chunk content');
    expect(result).toContain('Second chunk content');
  });
});

// ─── assembleSystemPrompt edge cases ────────────────────────────────────────

describe('assembleSystemPrompt', () => {
  it('includes persona instructions', () => {
    const prompt = assembleSystemPrompt({
      persona: 'socratic_guide',
      autonomyLevel: 'L2',
      cloAttainments: [],
      ragChunks: [],
    });
    expect(prompt).toContain('Socratic tutor');
  });

  it('includes autonomy level instructions', () => {
    const prompt = assembleSystemPrompt({
      persona: 'quick_explainer',
      autonomyLevel: 'L1',
      cloAttainments: [],
      ragChunks: [],
    });
    expect(prompt).toContain('AUTONOMY LEVEL L1');
    expect(prompt).toContain('NEVER provide direct answers');
  });

  it('includes tone modifier when provided', () => {
    const prompt = assembleSystemPrompt({
      persona: 'step_by_step_coach',
      autonomyLevel: 'L2',
      cloAttainments: [],
      ragChunks: [],
      toneModifier: 'Use an especially warm and encouraging tone.',
    });
    expect(prompt).toContain('warm and encouraging tone');
  });

  it('handles missing persona gracefully by using the provided persona', () => {
    // All three personas should produce valid prompts
    for (const persona of ['socratic_guide', 'step_by_step_coach', 'quick_explainer'] as const) {
      const prompt = assembleSystemPrompt({
        persona,
        autonomyLevel: 'L2',
        cloAttainments: [],
        ragChunks: [],
      });
      expect(prompt.length).toBeGreaterThan(0);
    }
  });

  it('strips PII from CLO titles', () => {
    const prompt = assembleSystemPrompt({
      persona: 'socratic_guide',
      autonomyLevel: 'L2',
      cloAttainments: [
        {
          clo_id: '1',
          clo_title: 'Contact student@uni.edu for help',
          bloom_level: 'Applying',
          attainment_percent: 50,
        },
      ],
      ragChunks: [],
    });
    expect(prompt).not.toContain('student@uni.edu');
    expect(prompt).toContain('[REDACTED_EMAIL]');
  });

  it('strips PII from chunk text', () => {
    const prompt = assembleSystemPrompt({
      persona: 'socratic_guide',
      autonomyLevel: 'L2',
      cloAttainments: [],
      ragChunks: [
        {
          chunk_id: '1',
          chunk_text: 'Student 550e8400-e29b-41d4-a716-446655440000 scored well',
          source_filename: 'notes.pdf',
          material_type: 'lecture_notes',
          similarity_score: 0.9,
        },
      ],
    });
    expect(prompt).not.toContain('550e8400-e29b-41d4-a716-446655440000');
  });
});

// ─── getPersonaPrompt ───────────────────────────────────────────────────────

describe('getPersonaPrompt', () => {
  it('returns distinct prompts for each persona', () => {
    const socratic = getPersonaPrompt('socratic_guide');
    const coach = getPersonaPrompt('step_by_step_coach');
    const explainer = getPersonaPrompt('quick_explainer');

    expect(socratic).not.toBe(coach);
    expect(socratic).not.toBe(explainer);
    expect(coach).not.toBe(explainer);
  });
});

// ─── getAutonomyPrompt ──────────────────────────────────────────────────────

describe('getAutonomyPrompt', () => {
  it('returns distinct prompts for each level', () => {
    const l1 = getAutonomyPrompt('L1');
    const l2 = getAutonomyPrompt('L2');
    const l3 = getAutonomyPrompt('L3');

    expect(l1).not.toBe(l2);
    expect(l1).not.toBe(l3);
    expect(l2).not.toBe(l3);
  });
});

// ─── formatConversationHistory ──────────────────────────────────────────────

describe('formatConversationHistory', () => {
  it('returns empty array for empty input', () => {
    expect(formatConversationHistory([])).toEqual([]);
  });

  it('returns all messages when fewer than 10', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
    ];
    const result = formatConversationHistory(messages);
    expect(result).toHaveLength(2);
  });

  it('returns last 10 messages when more than 10', () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));
    const result = formatConversationHistory(messages);
    expect(result).toHaveLength(10);
    expect(result[0]!.content).toContain('Message 5');
  });

  it('strips PII from message content', () => {
    const messages = [
      { role: 'user' as const, content: 'My email is test@example.com' },
    ];
    const result = formatConversationHistory(messages);
    expect(result[0]!.content).not.toContain('test@example.com');
    expect(result[0]!.content).toContain('[REDACTED_EMAIL]');
  });
});

// ─── PII utilities ──────────────────────────────────────────────────────────

describe('containsPII', () => {
  it('detects email addresses', () => {
    expect(containsPII('Contact john@example.com')).toBe(true);
  });

  it('detects UUIDs', () => {
    expect(containsPII('ID: 550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(containsPII('This is a normal sentence about algorithms.')).toBe(false);
  });
});

describe('stripPII', () => {
  it('replaces emails with redacted placeholder', () => {
    expect(stripPII('Email: test@uni.edu')).toContain('[REDACTED_EMAIL]');
  });

  it('replaces UUIDs with redacted placeholder', () => {
    const result = stripPII('Student 550e8400-e29b-41d4-a716-446655440000');
    expect(result).toContain('[REDACTED_UUID]');
  });
});
