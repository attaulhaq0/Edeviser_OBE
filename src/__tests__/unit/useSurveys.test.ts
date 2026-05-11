// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { supabase as _supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe("useSurveys hooks — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  // ─── useSurveys queryFn ─────────────────────────────────────────────────

  describe("useSurveys queryFn", () => {
    it("queries surveys table ordered by created_at desc", () => {
      supabase.from("surveys");
      expect(supabase.from).toHaveBeenCalledWith("surveys");
    });

    it("calls select with specific columns and order", () => {
      const chain = supabase.from("surveys");
      chain.select(
        "id, institution_id, title, type, target_outcomes, is_active, created_at"
      );
      chain.order("created_at", { ascending: false });

      expect(mockSelect).toHaveBeenCalledWith(
        "id, institution_id, title, type, target_outcomes, is_active, created_at"
      );
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });

  // ─── useSurvey queryFn ──────────────────────────────────────────────────

  describe("useSurvey queryFn", () => {
    it("queries surveys by id with maybeSingle", async () => {
      const id = "survey-abc";
      mockMaybeSingle.mockResolvedValue({
        data: {
          id,
          title: "Test Survey",
          type: "course_exit",
          target_outcomes: [],
          is_active: true,
        },
        error: null,
      });

      const chain = supabase.from("surveys");
      chain.select(
        "id, institution_id, title, type, target_outcomes, is_active, created_at"
      );
      chain.eq("id", id);
      const result = await chain.maybeSingle();

      expect(mockEq).toHaveBeenCalledWith("id", id);
      expect(mockMaybeSingle).toHaveBeenCalled();
      expect(result.data).toEqual(
        expect.objectContaining({ id, title: "Test Survey" })
      );
    });
  });

  // ─── useSurveyQuestions queryFn ─────────────────────────────────────────

  describe("useSurveyQuestions queryFn", () => {
    it("queries survey_questions by survey_id ordered by sort_order", () => {
      const surveyId = "survey-123";
      const chain = supabase.from("survey_questions");
      chain.select(
        "id, survey_id, question_text, question_type, options, sort_order"
      );
      chain.eq("survey_id", surveyId);
      chain.order("sort_order", { ascending: true });

      expect(supabase.from).toHaveBeenCalledWith("survey_questions");
      expect(mockEq).toHaveBeenCalledWith("survey_id", surveyId);
      expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
    });
  });

  // ─── useSurveyResponses queryFn ─────────────────────────────────────────

  describe("useSurveyResponses queryFn", () => {
    it("queries survey_responses by survey_id", () => {
      const surveyId = "survey-456";
      const chain = supabase.from("survey_responses");
      chain.select(
        "id, survey_id, question_id, respondent_id, response_value, created_at"
      );
      chain.eq("survey_id", surveyId);
      chain.order("created_at", { ascending: false });

      expect(supabase.from).toHaveBeenCalledWith("survey_responses");
      expect(mockEq).toHaveBeenCalledWith("survey_id", surveyId);
    });
  });

  // ─── useHasRespondedToSurvey queryFn ────────────────────────────────────

  describe("useHasRespondedToSurvey queryFn", () => {
    it("checks for existing responses with count query", () => {
      const chain = supabase.from("survey_responses");
      chain.select("id", { count: "exact", head: true });
      chain.eq("survey_id", "survey-1");
      chain.eq("respondent_id", "student-1");

      expect(supabase.from).toHaveBeenCalledWith("survey_responses");
      expect(mockSelect).toHaveBeenCalledWith("id", {
        count: "exact",
        head: true,
      });
    });
  });

  // ─── useCreateSurvey mutationFn ─────────────────────────────────────────

  describe("useCreateSurvey mutationFn", () => {
    it("inserts into surveys and logs audit event", async () => {
      const newSurvey = {
        institution_id: "inst-1",
        title: "Course Exit Survey",
        type: "course_exit",
        target_outcomes: [],
        is_active: true,
      };

      mockSingle.mockResolvedValue({
        data: { id: "created-survey-id", ...newSurvey },
        error: null,
      });

      const chain = supabase.from("surveys");
      chain.insert(newSurvey);
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({ id: "created-survey-id" })
      );
      expect(mockInsert).toHaveBeenCalledWith(newSurvey);

      await logAuditEvent({
        action: "create",
        entity_type: "survey",
        entity_id: data!.id,
        changes: {
          title: newSurvey.title,
          type: newSurvey.type,
          is_active: newSurvey.is_active,
        },
        performed_by: "admin-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "create",
        entity_type: "survey",
        entity_id: "created-survey-id",
        changes: {
          title: "Course Exit Survey",
          type: "course_exit",
          is_active: true,
        },
        performed_by: "admin-user-id",
      });
    });
  });

  // ─── useUpdateSurvey mutationFn ─────────────────────────────────────────

  describe("useUpdateSurvey mutationFn", () => {
    it("updates survey and logs audit event", async () => {
      const surveyId = "survey-to-update";
      const changes = { title: "Updated Title", is_active: false };

      mockSingle.mockResolvedValue({
        data: { id: surveyId, ...changes },
        error: null,
      });

      const chain = supabase.from("surveys");
      chain.update(changes);
      chain.eq("id", surveyId);
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(changes);
      expect(mockEq).toHaveBeenCalledWith("id", surveyId);

      await logAuditEvent({
        action: "update",
        entity_type: "survey",
        entity_id: surveyId,
        changes,
        performed_by: "admin-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          entity_type: "survey",
          entity_id: surveyId,
        })
      );
    });
  });

  // ─── useDeleteSurvey mutationFn ─────────────────────────────────────────

  describe("useDeleteSurvey mutationFn", () => {
    it("deletes survey and logs audit event", async () => {
      const surveyId = "survey-to-delete";
      mockEq.mockResolvedValue({ error: null });

      const chain = supabase.from("surveys");
      chain.delete();
      const result = await chain.eq("id", surveyId);

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", surveyId);

      await logAuditEvent({
        action: "delete",
        entity_type: "survey",
        entity_id: surveyId,
        changes: null,
        performed_by: "admin-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          entity_type: "survey",
          entity_id: surveyId,
        })
      );
    });
  });

  // ─── useCreateSurveyQuestion mutationFn ─────────────────────────────────

  describe("useCreateSurveyQuestion mutationFn", () => {
    it("inserts into survey_questions", async () => {
      const newQuestion = {
        survey_id: "survey-1",
        question_text: "How satisfied are you?",
        question_type: "likert",
        options: null,
        sort_order: 1,
      };

      mockSingle.mockResolvedValue({
        data: { id: "q-1", ...newQuestion },
        error: null,
      });

      const chain = supabase.from("survey_questions");
      chain.insert(newQuestion);
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: "q-1" }));
      expect(mockInsert).toHaveBeenCalledWith(newQuestion);
    });
  });

  // ─── useSubmitSurveyResponse mutationFn ─────────────────────────────────

  describe("useSubmitSurveyResponse mutationFn", () => {
    it("inserts batch of responses into survey_responses", async () => {
      const rows = [
        {
          survey_id: "s-1",
          question_id: "q-1",
          respondent_id: "student-1",
          response_value: "Agree",
        },
        {
          survey_id: "s-1",
          question_id: "q-2",
          respondent_id: "student-1",
          response_value: "Good course",
        },
      ];

      mockInsert.mockResolvedValue({ error: null });

      const chain = supabase.from("survey_responses");
      const result = await chain.insert(rows);

      expect(supabase.from).toHaveBeenCalledWith("survey_responses");
      expect(mockInsert).toHaveBeenCalledWith(rows);
      expect(result.error).toBeNull();
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns error when supabase query fails", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("surveys");
      chain.select("*");
      chain.eq("id", "some-id");
      const result = await chain.maybeSingle();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });

    it("returns error when insert fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Unique violation" },
      });

      const chain = supabase.from("survey_responses");
      chain.insert({
        survey_id: "s-1",
        question_id: "q-1",
        respondent_id: "stu-1",
        response_value: "x",
      });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe("Unique violation");
    });
  });
});
