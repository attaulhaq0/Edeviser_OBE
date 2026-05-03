# Tasks — AI Chat Tutor with RAG Engine

## 1. Database Schema & Migrations

- [x] 1.1 Create migration: enable pgvector extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- [x] 1.2 Create migration: `course_material_embeddings` table with HNSW index on embedding column
- [x] 1.3 Create migration: `tutor_conversations` table with indexes on student_id and course_id
- [x] 1.4 Create migration: `tutor_messages` table with CASCADE delete on conversation_id
- [x] 1.5 Create migration: `tutor_usage_limits` table with unique constraint on (student_id, usage_date)
- [x] 1.6 Create migration: `tutor_llm_logs` table for LLM API call monitoring
- [x] 1.7 Create migration: `search_course_materials` pgvector similarity search function
- [x] 1.8 Create migration: RLS policies for all new tables (embeddings, conversations, messages, usage_limits, llm_logs)

## 2. Shared Library Code

- [x] 2.1 Create `src/lib/tutorSchemas.ts` — Zod schemas for sendMessage, rateMessage, tutorAnalytics
- [x] 2.2 Create `src/lib/tutorApi.ts` — Edge Function call helpers with SSE streaming support
- [x] 2.3 Add tutor query keys to `src/lib/queryKeys.ts` (tutorConversations, tutorMessages, tutorUsage, tutorAnalytics)
- [x] 2.4 Create `src/lib/tutorPrompt.ts` — System prompt assembly (persona + CLO context + chunks, no PII)
- [x] 2.5 Create `src/lib/tutorChunker.ts` — Text chunking function (200–500 tokens, 50-token overlap)
- [x] 2.6 Create `src/lib/tutorIntegrityDetector.ts` — Academic integrity keyword detection

## 3. Edge Functions

- [x] 3.1 Create `supabase/functions/chat-with-tutor/index.ts` — Main chat Edge Function
  - [x] 3.1.1 JWT validation and course enrollment check
  - [x] 3.1.2 Rate limit and token budget check against `tutor_usage_limits`
  - [x] 3.1.3 Query embedding generation via OpenAI API
  - [x] 3.1.4 pgvector similarity search (top 5, score ≥ 0.7, course-scoped)
  - [x] 3.1.5 CLO attainment fetch and system prompt assembly
  - [x] 3.1.6 LLM streaming via OpenRouter with SSE response
  - [x] 3.1.7 Message persistence (user + assistant) with source citations
  - [x] 3.1.8 Usage counter increment and LLM call logging
  - [x] 3.1.9 Academic integrity detection and flagging
  - [x] 3.1.10 XP award trigger (3+ messages, once per conversation)
  - [x] 3.1.11 Retry logic with exponential backoff and model fallback
- [x] 3.2 Create `supabase/functions/embed-course-material/index.ts` — Chunking + embedding pipeline
  - [x] 3.2.1 File download from Supabase Storage and text extraction (PDF, DOCX, plain text)
  - [x] 3.2.2 Text chunking (200–500 tokens, 50-token overlap)
  - [x] 3.2.3 Batch embedding generation via OpenAI API
  - [x] 3.2.4 Chunk insertion into `course_material_embeddings` with metadata
  - [x] 3.2.5 Async processing for documents > 100 pages with teacher notification
  - [x] 3.2.6 Error handling: mark `indexing_failed`, notify teacher
  - [x] 3.2.7 Re-indexing: delete old chunks before inserting new ones
  - [x] 3.2.8 Auto-indexing trigger for assignment/rubric create/update
- [x] 3.3 Create `supabase/functions/tutor-analytics/index.ts` — Anonymized aggregate analytics
  - [x] 3.3.1 Aggregate metrics: total conversations, messages, avg per conversation, avg satisfaction
  - [x] 3.3.2 Top questioned CLOs by conversation frequency
  - [x] 3.3.3 Common topics extraction (anonymized)
  - [x] 3.3.4 Usage over time (daily counts, last 30 days)
  - [x] 3.3.5 PII exclusion validation

## 4. TanStack Query Hooks

- [x] 4.1 Create `src/hooks/useTutorConversations.ts` — List, create, delete conversations
- [x] 4.2 Create `src/hooks/useTutorMessages.ts` — Message history, send message (SSE), rate message
- [x] 4.3 Create `src/hooks/useTutorUsage.ts` — Daily usage status (message count, token count, limits)
- [x] 4.4 Create `src/hooks/useTutorAnalytics.ts` — Teacher analytics queries

## 5. Chat UI Components

- [x] 5.1 Create `src/pages/student/tutor/TutorPage.tsx` — Main tutor page with sidebar + chat layout
- [x] 5.2 Create `src/pages/student/tutor/ChatPanel.tsx` — Message list, text input, file attachments, typing indicator
- [x] 5.3 Create `src/pages/student/tutor/ConversationSidebar.tsx` — Past conversations list with delete
- [x] 5.4 Create `src/pages/student/tutor/PersonaSelector.tsx` — Persona picker (3 personas)
- [x] 5.5 Create `src/components/shared/ChatMessage.tsx` — Message bubble with markdown, citations, rating
- [x] 5.6 Create `src/components/shared/SourceCitationPanel.tsx` — Expandable citation detail panel
- [x] 5.7 Create `src/components/shared/SatisfactionRating.tsx` — Thumbs up/down component
- [x] 5.8 Create `src/components/shared/TutorEntryButton.tsx` — Contextual "Ask Tutor" button

## 6. Contextual Entry Points

- [x] 6.1 Add "Ask Tutor" button to `AssignmentDetailPage.tsx` (scoped to assignment CLOs)
- [x] 6.2 Add "Get Help" button to CLO progress bars on StudentDashboard (scoped to specific CLO)
- [x] 6.3 Add "Ask Tutor" deep link to grade notification for low-scoring submissions

## 7. Teacher Analytics Dashboard

- [x] 7.1 Create `src/pages/teacher/tutor-analytics/TutorAnalyticsPage.tsx` — KPI cards, charts
- [x] 7.2 Add "Top Questioned CLOs" horizontal bar chart (Recharts)
- [x] 7.3 Add "Common Topics" frequency list
- [x] 7.4 Add "Usage Over Time" line chart (last 30 days)

## 8. Routing & Navigation

- [x] 8.1 Add `/student/tutor` and `/student/tutor/:conversationId` routes to AppRouter
- [x] 8.2 Add tutor nav item to StudentLayout sidebar
- [x] 8.3 Add `/teacher/tutor-analytics` route to AppRouter
- [x] 8.4 Add tutor analytics nav item to TeacherLayout sidebar

## 9. Rate Limiting & Usage UI

- [x] 9.1 Add usage warning banner to ChatPanel (shows at 80% of daily limit)
- [x] 9.2 Add input disabled state when daily limit reached
- [x] 9.3 Add token budget exceeded message

## 10. XP Integration

- [x] 10.1 Add `tutor_engagement` source to award-xp Edge Function
- [x] 10.2 Add rating XP logic (5 XP per rating, max 3/day)
- [x] 10.3 Add diminishing returns for tutor XP (reduced after 5 conversations in 24h)

## 11. Property-Based Tests

- [x] 11.1 `src/__tests__/properties/tutorChunking.property.test.ts` — P1: chunk size and overlap invariants
- [x] 11.2 `src/__tests__/properties/tutorPromptAssembly.property.test.ts` — P10, P11, P14, P36: CLO gaps, chunks in prompt, persona distinctness, no PII
- [x] 11.3 `src/__tests__/properties/tutorRateLimits.property.test.ts` — P25, P26, P27: message limit, warning threshold, token budget
- [x] 11.4 `src/__tests__/properties/tutorValidation.property.test.ts` — P20, P21: text input and file attachment validation
- [x] 11.5 `src/__tests__/properties/tutorIntegrity.property.test.ts` — P23: academic integrity detection
- [x] 11.6 `src/__tests__/properties/tutorAnalytics.property.test.ts` — P28, P29, P30, P31: aggregation, CLO ranking, no PII, daily counts
- [x] 11.7 `src/__tests__/properties/tutorXp.property.test.ts` — P32, P33: XP award threshold, rating XP cap
- [x] 11.8 `src/__tests__/properties/tutorConversations.property.test.ts` — P13, P15, P17: context window, persona switch, ordering

## 12. Unit Tests

- [x] 12.1 `src/__tests__/unit/tutorSchemas.test.ts` — Zod schema validation (valid/invalid payloads)
- [x] 12.2 `src/__tests__/unit/tutorPromptAssembly.test.ts` — System prompt assembly edge cases
- [x] 12.3 `src/__tests__/unit/tutorCitationParsing.test.ts` — Citation marker extraction from response text
- [x] 12.4 `src/__tests__/unit/tutorSseParser.test.ts` — SSE event type parsing
- [x] 12.5 `src/__tests__/unit/tutorRetryBackoff.test.ts` — Exponential backoff delay calculation (P34)

## 13. Autonomy Level Database & Library

- [x] 13.1 Create migration: add `tutor_autonomy_level` column to `assignments` table (VARCHAR(2), default 'L1')
- [x] 13.2 Create migration: add `tutor_autonomy_level` column to `clos` table (VARCHAR(2), default 'L2')
- [x] 13.3 Create migration: add `autonomy_override` column to `tutor_conversations` table
- [x] 13.4 Create migration: add `autonomy_level` and `nudge_type` columns to `tutor_messages` table
- [x] 13.5 Create `src/lib/tutorAutonomy.ts` — Autonomy level resolution logic (assignment > CLO > default, student override capped by teacher ceiling)
- [x] 13.6 Update `src/lib/tutorSchemas.ts` — Add `autonomyLevelSchema`, `updateAssignmentAutonomySchema`, `updateCLOAutonomySchema`
- [x] 13.7 Update `src/lib/tutorPrompt.ts` — Add autonomy level prompt modifiers (L1/L2/L3) to system prompt assembly

## 14. Autonomy Level UI & Hooks

- [x] 14.1 Create `src/hooks/useTutorAutonomy.ts` — Hooks for reading/updating assignment and CLO autonomy levels
- [x] 14.2 Create `src/components/shared/AutonomyToggle.tsx` — Student-facing "Figure it out" / "Just explain it" toggle
- [x] 14.3 Update `src/pages/student/tutor/ChatPanel.tsx` — Add AutonomyToggle to chat header
- [x] 14.4 Update `src/pages/teacher/assignments/AssignmentForm.tsx` — Add autonomy level select field
- [x] 14.5 Update `src/pages/teacher/clos/CLOForm.tsx` — Add autonomy level select field
- [x] 14.6 Update `supabase/functions/chat-with-tutor/index.ts` — Integrate autonomy resolution and log level per message

## 15. Learning Plan Updates

- [x] 15.1 Create migration: `tutor_plan_updates` table with indexes and RLS policies
- [x] 15.2 Create `supabase/functions/generate-plan-update/index.ts` — Learning plan update generation Edge Function
  - [x] 15.2.1 Fetch student CLO attainment and recent tutor messages
  - [x] 15.2.2 Retrieve top 3 relevant materials via RAG
  - [x] 15.2.3 Generate study time and planner recommendations via LLM
  - [x] 15.2.4 Persist suggestion to `tutor_plan_updates` table
- [x] 15.3 Update `supabase/functions/chat-with-tutor/index.ts` — Add 5-interaction CLO trigger check and plan update SSE event
- [x] 15.4 Create `src/components/shared/LearningPlanCard.tsx` — Plan update card with accept/modify/dismiss actions
- [x] 15.5 Update `src/hooks/useTutorMessages.ts` — Handle `plan_update` SSE event type
- [x] 15.6 Add plan update response mutation to `src/hooks/useTutorConversations.ts`
- [x] 15.7 Create `src/lib/tutorSchemas.ts` additions — `planUpdateResponseSchema`

## 16. Persona Auto-Selection

- [x] 16.1 Create `src/lib/tutorPersonaAutoSelect.ts` — Big Five to persona mapping logic
- [x] 16.2 Update `supabase/functions/chat-with-tutor/index.ts` — Fetch Big Five profile and auto-select persona for new conversations
- [x] 16.3 Update `src/pages/student/tutor/PersonaSelector.tsx` — Show auto-recommendation with "Change" option
- [x] 16.4 Update `src/hooks/useTutorConversations.ts` — Pass Big Five profile data for persona recommendation

## 17. AI Dependency Prevention

- [x] 17.1 Create `src/lib/independenceCalculator.ts` — Independence score calculation (1 - AI-assisted/total submissions)
- [x] 17.2 Update `supabase/functions/chat-with-tutor/index.ts` — Add same-topic detection and independence nudge injection
- [x] 17.3 Create `src/hooks/useIndependenceScore.ts` — Hook for fetching independence scores per student per CLO
- [x] 17.4 Update `src/pages/student/StudentDashboard.tsx` — Display independence score alongside CLO attainment
- [x] 17.5 Create `src/components/shared/IndependenceScoreBadge.tsx` — Color-coded independence score chip
- [x] 17.6 Update `supabase/functions/check-badges/index.ts` — Add "Self-Reliant Scholar" badge condition check
- [x] 17.7 Add `self_reliant_scholar` badge definition to badge definitions

## 18. Teacher-AI Collaboration

- [x] 18.1 Create migration: `teacher_handoff_requests` table with indexes and RLS policies
- [x] 18.2 Update `supabase/functions/chat-with-tutor/index.ts` — Add handoff trigger detection (low RAG confidence, repeated questions, low satisfaction)
- [x] 18.3 Create `src/components/shared/TeacherHandoffCard.tsx` — In-conversation handoff suggestion with consent checkbox
- [x] 18.4 Create `src/hooks/useTeacherHandoffs.ts` — CRUD hooks for handoff requests (student create, teacher read/respond)
- [x] 18.5 Create `src/pages/teacher/tutor-analytics/TeacherHandoffPage.tsx` — Teacher handoff dashboard tab
  - [x] 18.5.1 Pending handoff requests list with conversation summaries
  - [x] 18.5.2 Most-asked questions section (anonymized)
  - [x] 18.5.3 Low-confidence topics section
  - [x] 18.5.4 High AI dependency students section
- [x] 18.6 Update `src/pages/teacher/tutor-analytics/TutorAnalyticsPage.tsx` — Add "Coverage Gaps" and "Material Effectiveness" sections
- [x] 18.7 Add `/teacher/tutor-handoffs` route to AppRouter and nav item to TeacherLayout sidebar
- [x] 18.8 Update `src/lib/tutorSchemas.ts` — Add `createHandoffSchema`, `respondToHandoffSchema`

## 19. New Property-Based & Unit Tests

- [x] 19.1 `src/__tests__/properties/tutorAutonomy.property.test.ts` — P38, P39, P40, P41, P42: autonomy resolution, override ceiling, logging, prompt inclusion
- [x] 19.2 `src/__tests__/properties/tutorPlanUpdates.property.test.ts` — P43, P44, P46: trigger threshold, required fields, adaptive frequency
- [x] 19.3 `src/__tests__/properties/tutorPersonaAutoSelect.property.test.ts` — P47, P48: Big Five mapping, fallback
- [x] 19.4 `src/__tests__/properties/tutorIndependence.property.test.ts` — P49, P50, P51, P52: nudge trigger, non-blocking, score calculation, badge award
- [x] 19.5 `src/__tests__/properties/tutorHandoff.property.test.ts` — P53, P54, P55: trigger conditions, consent requirement, coverage gaps
- [x] 19.6 `src/__tests__/unit/tutorAutonomyResolution.test.ts` — Autonomy level resolution edge cases
- [x] 19.7 `src/__tests__/unit/tutorPersonaAutoSelect.test.ts` — Big Five mapping, missing profile fallback
- [x] 19.8 `src/__tests__/unit/tutorIndependenceScore.test.ts` — Independence score calculation, zero submissions
- [x] 19.9 `src/__tests__/unit/tutorHandoffTrigger.test.ts` — Handoff trigger detection logic
- [x] 19.10 `src/__tests__/unit/tutorPlanUpdateAcceptance.test.ts` — Acceptance rate calculation and frequency adaptation
