import { describe, it, expect } from 'vitest';
import { parseSSELine } from '@/lib/tutorApi';

describe('parseSSELine', () => {
  it('parses a token event', () => {
    const event = parseSSELine('data: {"type":"token","data":"Hello"}');
    expect(event).toEqual({ type: 'token', data: 'Hello' });
  });

  it('parses a citations event', () => {
    const citations = [
      {
        chunk_id: 'c1',
        chunk_text: 'Some text',
        source_filename: 'lecture.pdf',
        material_type: 'lecture_notes',
        similarity_score: 0.9,
      },
    ];
    const event = parseSSELine(`data: ${JSON.stringify({ type: 'citations', data: citations })}`);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('citations');
  });

  it('parses a done event', () => {
    const event = parseSSELine(
      'data: {"type":"done","data":{"message_id":"abc-123","tokens_used":150}}',
    );
    expect(event).toEqual({
      type: 'done',
      data: { message_id: 'abc-123', tokens_used: 150 },
    });
  });

  it('parses an error event', () => {
    const event = parseSSELine(
      'data: {"type":"error","data":{"code":"429","message":"Rate limited"}}',
    );
    expect(event).toEqual({
      type: 'error',
      data: { code: '429', message: 'Rate limited' },
    });
  });

  it('parses a plan_update event', () => {
    const planUpdate = {
      id: 'pu-1',
      clo_id: 'clo-1',
      clo_title: 'Algorithms',
      study_time_recommendation: 'Increase to 3 hours/week',
      recommended_materials: [],
      suggested_planner_sessions: 2,
      interaction_count: 5,
    };
    const event = parseSSELine(
      `data: ${JSON.stringify({ type: 'plan_update', data: planUpdate })}`,
    );
    expect(event).not.toBeNull();
    expect(event!.type).toBe('plan_update');
  });

  it('returns null for empty lines', () => {
    expect(parseSSELine('')).toBeNull();
  });

  it('returns null for comment lines', () => {
    expect(parseSSELine(': this is a comment')).toBeNull();
  });

  it('returns null for non-data lines', () => {
    expect(parseSSELine('event: message')).toBeNull();
    expect(parseSSELine('id: 123')).toBeNull();
    expect(parseSSELine('retry: 5000')).toBeNull();
  });

  it('returns null for [DONE] signal', () => {
    expect(parseSSELine('data: [DONE]')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseSSELine('data: {invalid json}')).toBeNull();
  });

  it('returns null for data: with empty content', () => {
    expect(parseSSELine('data: ')).toBeNull();
    expect(parseSSELine('data:  ')).toBeNull();
  });
});
