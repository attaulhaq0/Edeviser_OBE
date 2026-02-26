# Tasks — AI Chat Tutor with RAG Engine

## 1. Database Schema & Migrations

- [ ] 1.1 Create migration: enable pgvector extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] 1.2 Create migration: `course_material_embeddings` table with HNSW index on embedding column
- [ ] 1.3 Create migration: `tutor_conversations` table with indexes on student_id and course_id
- [ ] 1.4 Create migration: `tutor_messages` table with CASCADE delete on conversation_id
- [ ] 1.5 Create migration: `tutor_usage_limits` table with unique constraint on (student_id, usage_date)
- [ ] 1.6 Create migration: `tutor_llm_logs` table for LLM API call monitoring
- [ ] 1.7 Create migration: `search_course_materials` pgvector similarity search function
- [ ] 1.8 Create migration: RLS policies for all new tables (embeddings, conversations, messages, usage_limits, llm_logs)

## 2. Shared Library Code

- [ ] 2.1 Create `src/lib/tutorSchemas.ts` — Zod schemas for sendMessage, rateMessage, tutorAnalytics
- [ ] 2.2 Create `src/lib/tutorApi.ts` — Edge Function call helpers with SSE streaming support
- [ ] 2.3 Add tutor query keys to `src/lib/queryKeys.ts` (tutorConversations, tutorMessages, tutorUsage, tutorAnalytics)
- [ ] 2.4 Create `src/lib/tutorPrompt.ts` — System prompt assembly (persona + CLO context + chunks, no PII)
- [ ] 2.5 Create `src/lib/tutorChunker.ts` — Text chunking function (200–500 tokens, 50-token overlap)
- [ ] 2.6 Create `src/lib/tutorIntegrityDetector.ts` — Academic integrity keyword detection

## 3. Edge Functions

- [ ] 3.1 Create `supabase/functions/chat-with-tutor/index.ts` — Main chat Edge Function
  - [ ] 3.1.1 JWT validation and course enrollment check
  - [ ] 3.1.2 Rate limit and token budget check against `tutor_usage_limits`
  - [ ] 3.1.3 Query embedding generation via OpenAI API
  - [ ] 3.1.4 pgvector similarity search (top 5, score ≥ 0.7, course-scoped)
  - [ ] 3.1.5 CLO attainment fetch and system prompt assembly
  - [ ] 3.1.6 LLM streaming via OpenRouter with SSE response
  - [ ] 3.1.7 Message persistence (user + assistant) with source citations
  - [ ] 3.1.8 Usage counter increment and LLM call logging
  - [ ] 3.1.9 Academic integrity detection and flagging
  - [ ] 3.1.10 XP award trigger (3+ messages, once per conversation)
  - [ ] 3.1.11 Retry logic with exponential backoff and model fallback
- [ ] 3.2 Create `supabase/functions/embed-course-material/index.ts` — Chunking + embedding pipeline
  - [ ] 3.2.1 File download from Supabase Storage and text extraction (PDF, DOCX, plain text)
  - [ ] 3.2.2 Text chunking (200–500 tokens, 50-token overlap)
  - [ ] 3.2.3 Batch embedding generation via OpenAI API
  - [ ] 3.2.4 Chunk insertion into `course_material_embeddings` with metadata
  - [ ] 3.2.5 Async processing for documents > 100 pages with teacher notification
  - [ ] 3.2.6 Error handling: mark `indexing_failed`, notify teacher
  - [ ] 3.2.7 Re-indexing: delete old chunks before inserting new ones
  - [ ] 3.2.8 Auto-indexing trigger for assignment/rubric create/update
- [ ] 3.3 Create `supabase/functions/tutor-analytics/index.ts` — Anonymized aggregate analytics
  - [ ] 3.3.1 Aggregate metrics: total conversations, messages, avg per conversation, avg satisfaction
  - [ ] 3.3.2 Top questioned CLOs by conversation frequency
  - [ ] 3.3.3 Common topics extraction (anonymized)
  - [ ] 3.3.4 Usage over time (daily counts, last 30 days)
  - [ ] 3.3.5 PII exclusion validation

## 4. TanStack Query Hooks

- [ ] 4.1 Create `src/hooks/useTutorConversations.ts` — List, create, delete conversations
- [ ] 4.2 Create `src/hooks/useTutorMessages.ts` — Message history, send message (SSE), rate message
- [ ] 4.3 Create `src/hooks/useTutorUsage.ts` — Daily usage status (message count, token count, limits)
- [ ] 4.4 Create `src/hooks/useTutorAnalytics.ts` — Teacher analytics queries

## 5. Chat UI Components

- [ ] 5.1 Create `src/pages/student/tutor/TutorPage.tsx` — Main tutor page with sidebar + chat layout
- [ ] 5.2 Create `src/pages/student/tutor/ChatPanel.tsx` — Message list, text input, file attachments, typing indicator
- [ ] 5.3 Create `src/pages/student/tutor/ConversationSidebar.tsx` — Past conversations list with delete
- [ ] 5.4 Create `src/pages/student/tutor/PersonaSelector.tsx` — Persona picker (3 personas)
- [ ] 5.5 Create `src/components/shared/ChatMessage.tsx` — Message bubble with markdown, citations, rating
- [ ] 5.6 Create `src/components/shared/SourceCitationPanel.tsx` — Expandable citation detail panel
- [ ] 5.7 Create `src/components/shared/SatisfactionRating.tsx` — Thumbs up/down component
- [ ] 5.8 Create `src/components/shared/TutorEntryButton.tsx` — Contextual "Ask Tutor" button

## 6. Contextual Entry Points

- [ ] 6.1 Add "Ask Tutor" button to `AssignmentDetailPage.tsx` (scoped to assignment CLOs)
- [ ] 6.2 Add "Get Help" button to CLO progress bars on StudentDashboard (scoped to specific CLO)
- [ ] 6.3 Add "Ask Tutor" deep link to grade notification for low-scoring submissions

## 7. Teacher Analytics Dashboard

- [ ] 7.1 Create `src/pages/teacher/tutor-analytics/TutorAnalyticsPage.tsx` — KPI cards, charts
- [ ] 7.2 Add "Top Questioned CLOs" horizontal bar chart (Recharts)
- [ ] 7.3 Add "Common Topics" frequency list
- [ ] 7.4 Add "Usage Over Time" line chart (last 30 days)

## 8. Routing & Navigation

- [ ] 8.1 Add `/student/tutor` and `/student/tutor/:conversationId` routes to AppRouter
- [ ] 8.2 Add tutor nav item to StudentLayout sidebar
- [ ] 8.3 Add `/teacher/tutor-analytics` route to AppRouter
- [ ] 8.4 Add tutor analytics nav item to TeacherLayout sidebar

## 9. Rate Limiting & Usage UI

- [ ] 9.1 Add usage warning banner to ChatPanel (shows at 80% of daily limit)
- [ ] 9.2 Add input disabled state when daily limit reached
- [ ] 9.3 Add token budget exceeded message

## 10. XP Integration

- [ ] 10.1 Add `tutor_engagement` source to award-xp Edge Function
- [ ] 10.2 Add rating XP logic (5 XP per rating, max 3/day)
- [ ] 10.3 Add diminishing returns for tutor XP (reduced after 5 conversations in 24h)

## 11. Property-Based Tests

- [ ] 11.1 `src/__tests__/properties/tutorChunking.property.test.ts` — P1: chunk size and overlap invariants
- [ ] 11.2 `src/__tests__/properties/tutorPromptAssembly.property.test.ts` — P10, P11, P14, P36: CLO gaps, chunks in prompt, persona distinctness, no PII
- [ ] 11.3 `src/__tests__/properties/tutorRateLimits.property.test.ts` — P25, P26, P27: message limit, warning threshold, token budget
- [ ] 11.4 `src/__tests__/properties/tutorValidation.property.test.ts` — P20, P21: text input and file attachment validation
- [ ] 11.5 `src/__tests__/properties/tutorIntegrity.property.test.ts` — P23: academic integrity detection
- [ ] 11.6 `src/__tests__/properties/tutorAnalytics.property.test.ts` — P28, P29, P30, P31: aggregation, CLO ranking, no PII, daily counts
- [ ] 11.7 `src/__tests__/properties/tutorXp.property.test.ts` — P32, P33: XP award threshold, rating XP cap
- [ ] 11.8 `src/__tests__/properties/tutorConversations.property.test.ts` — P13, P15, P17: context window, persona switch, ordering

## 12. Unit Tests

- [ ] 12.1 `src/__tests__/unit/tutorSchemas.test.ts` — Zod schema validation (valid/invalid payloads)
- [ ] 12.2 `src/__tests__/unit/tutorPromptAssembly.test.ts` — System prompt assembly edge cases
- [ ] 12.3 `src/__tests__/unit/tutorCitationParsing.test.ts` — Citation marker extraction from response text
- [ ] 12.4 `src/__tests__/unit/tutorSseParser.test.ts` — SSE event type parsing
- [ ] 12.5 `src/__tests__/unit/tutorRetryBackoff.test.ts` — Exponential backoff delay calculation (P34)

## 13. Autonomy Level Database & Library

- [ ] 13.1 Create migration: add `tutor_autonomy_level` column to `assignments` table (VARCHAR(2), default 'L1')
- [ ] 13.2 Create migration: add `tutor_autonomy_level` column to `clos` table (VARCHAR(2), default 'L2')
- [ ] 13.3 Create migration: add `autonomy_override` column to `tutor_conversations` table
- [ ] 13.4 Create migration: add `autonomy_level` and `nudge_type` columns to `tutor_messages` table
- [ ] 13.5 Create `src/lib/tutorAutonomy.ts` — Autonomy level resolution logic (assignment > CLO > default, student override capped by teacher ceiling)
- [ ] 13.6 Update `src/lib/tutorSchemas.ts` — Add `autonomyLevelSchema`, `updateAssignmentAutonomySchema`, `updateCLOAutonomySchema`
- [ ] 13.7 Update `src/lib/tutorPrompt.ts` — Add autonomy level prompt modifiers (L1/L2/L3) to system prompt assembly

## 14. Autonomy Level UI & Hooks

- [ ] 14.1 Create `src/hooks/useTutorAutonomy.ts` — Hooks for reading/updating assignment and CLO autonomy levels
- [ ] 14.2 Create `src/components/shared/AutonomyToggle.tsx` — Student-facing "Figure it out" / "Just explain it" toggle
- [ ] 14.3 Update `src/pages/student/tutor/ChatPanel.tsx` — Add AutonomyToggle to chat header
- [ ] 14.4 Update `src/pages/teacher/assignments/AssignmentForm.tsx` — Add autonomy level select field
- [ ] 14.5 Update `src/pages/teacher/clos/CLOForm.tsx` — Add autonomy level select field
- [ ] 14.6 Update `supabase/functions/chat-with-tutor/index.ts` — Integrate autonomy resolution and log level per message

## 15. Learning Plan Updates

- [ ] 15.1 Create migration: `tutor_plan_updates` table with indexes and RLS policies
- [ ] 15.2 Create `supabase/functions/generate-plan-update/index.ts` — Learning plan update generation Edge Function
  - [ ] 15.2.1 Fetch student CLO attainment and recent tutor messages
  - [ ] 15.2.2 Retrieve top 3 relevant materials via RAG
  - [ ] 15.2.3 Generate study time and planner recommendations via LLM
  - [ ] 15.2.4 Persist suggestion to `tutor_plan_updates` table
- [ ] 15.3 Update `supabase/functions/chat-with-tutor/index.ts` — Add 5-interaction CLO trigger check and plan update SSE event
- [ ] 15.4 Create `src/components/shared/LearningPlanCard.tsx` — Plan update card with accept/modify/dismiss actions
- [ ] 15.5 Update `src/hooks/useTutorMessages.ts` — Handle `plan_update` SSE event type
- [ ] 15.6 Add plan update response mutation to `src/hooks/useTutorConversations.ts`
- [ ] 15.7 Create `src/lib/tutorSchemas.ts` additions — `planUpdateResponseSchema`

## 16. Persona Auto-Selection

- [ ] 16.1 Create `src/lib/tutorPersonaAutoSelect.ts` — Big Five to persona mapping logic
- [ ] 16.2 Update `supabase/functions/chat-with-tutor/index.ts` — Fetch Big Five profile and auto-select persona for new conversations
- [ ] 16.3 Update `src/pages/student/tutor/PersonaSelector.tsx` — Show auto-recommendation with "Change" option
- [ ] 16.4 Update `src/hooks/useTutorConversations.ts` — Pass Big Five profile data for persona recommendation

## 17. AI Dependency Prevention

- [ ] 17.1 Create `src/lib/independenceCalculator.ts` — Independence score calculation (1 - AI-assisted/total submissions)
- [ ] 17.2 Update `supabase/functions/chat-with-tutor/index.ts` — Add same-topic detection and independence nudge injection
- [ ] 17.3 Create `src/hooks/useIndependenceScore.ts` — Hook for fetching independence scores per student per CLO
- [ ] 17.4 Update `src/pages/student/StudentDashboard.tsx` — Display independence score alongside CLO attainment
- [ ] 17.5 Create `src/components/shared/IndependenceScoreBadge.tsx` — Color-coded independence score chip
- [ ] 17.6 Update `supabase/functions/check-badges/index.ts` — Add "Self-Reliant Scholar" badge condition check
- [ ] 17.7 Add `self_reliant_scholar` badge definition to badge definitions

## 18. Teacher-AI Collaboration

- [ ] 18.1 Create migration: `teacher_handoff_requests` table with indexes and RLS policies
- [ ] 18.2 Update `supabase/functions/chat-with-tutor/index.ts` — Add handoff trigger detection (low RAG confidence, repeated questions, low satisfaction)
- [ ] 18.3 Create `src/components/shared/TeacherHandoffCard.tsx` — In-conversation handoff suggestion with consent checkbox
- [ ] 18.4 Create `src/hooks/useTeacherHandoffs.ts` — CRUD hooks for handoff requests (student create, teacher read/respond)
- [ ] 18.5 Create `src/pages/teacher/tutor-analytics/TeacherHandoffPage.tsx` — Teacher handoff dashboard tab
  - [ ] 18.5.1 Pending handoff requests list with conversation summaries
  - [ ] 18.5.2 Most-asked questions section (anonymized)
  - [ ] 18.5.3 Low-confidence topics section
  - [ ] 18.5.4 High AI dependency students section
- [ ] 18.6 Update `src/pages/teacher/tutor-analytics/TutorAnalyticsPage.tsx` — Add "Coverage Gaps" and "Material Effectiveness" sections
- [ ] 18.7 Add `/teacher/tutor-handoffs` route to AppRouter and nav item to TeacherLayout sidebar
- [ ] 18.8 Update `src/lib/tutorSchemas.ts` — Add `createHandoffSchema`, `respondToHandoffSchema`

## 19. New Property-Based & Unit Tests

- [ ] 19.1 `src/__tests__/properties/tutorAutonomy.property.test.ts` — P38, P39, P40, P41, P42: autonomy resolution, override ceiling, logging, prompt inclusion
- [ ] 19.2 `src/__tests__/properties/tutorPlanUpdates.property.test.ts` — P43, P44, P46: trigger threshold, required fields, adaptive frequency
- [ ] 19.3 `src/__tests__/properties/tutorPersonaAutoSelect.property.test.ts` — P47, P48: Big Five mapping, fallback
- [ ] 19.4 `src/__tests__/properties/tutorIndependence.property.test.ts` — P49, P50, P51, P52: nudge trigger, non-blocking, score calculation, badge award
- [ ] 19.5 `src/__tests__/properties/tutorHandoff.property.test.ts` — P53, P54, P55: trigger conditions, consent requirement, coverage gaps
- [ ] 19.6 `src/__tests__/unit/tutorAutonomyResolution.test.ts` — Autonomy level resolution edge cases
- [ ] 19.7 `src/__tests__/unit/tutorPersonaAutoSelect.test.ts` — Big Five mapping, missing profile fallback
- [ ] 19.8 `src/__tests__/unit/tutorIndependenceScore.test.ts` — Independence score calculation, zero submissions
- [ ] 19.9 `src/__tests__/unit/tutorHandoffTrigger.test.ts` — Handoff trigger detection logic
- [ ] 19.10 `src/__tests__/unit/tutorPlanUpdateAcceptance.test.ts` — Acceptance rate calculation and frequency adaptation
