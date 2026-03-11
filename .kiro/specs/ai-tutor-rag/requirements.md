# Requirements Document — AI Chat Tutor with RAG Engine

## Introduction

The AI Chat Tutor with RAG (Retrieval-Augmented Generation) Engine extends the Edeviser platform with a conversational AI tutoring interface for students, grounded in actual course materials via vector search. The feature combines a multi-persona chat UI accessible from the student dashboard with a backend RAG pipeline that indexes course materials using Supabase pgvector and generates contextual, CLO-aligned responses via OpenAI/DeepSeek through OpenRouter. Teachers gain access to anonymized aggregate tutor usage analytics. The tutor operates across explicit autonomy levels (L1–L3) that teachers can configure per assignment, and adapts its persona selection based on the student's Big Five personality profile from onboarding. The system proactively generates learning plan updates based on accumulated interaction patterns, includes independence nudges to prevent AI dependency, and supports teacher handoff when the AI detects it cannot help effectively. This feature builds on the existing OBE engine (ILO → PLO → CLO mapping, evidence rollup, attainment tracking) and gamification engine (XP, streaks, badges) to deliver personalized tutoring that references the student's competency gaps, Bloom's taxonomy level, and actual course content.

## Glossary

- **Tutor_Engine**: The backend subsystem (Edge Functions) that orchestrates RAG retrieval, prompt construction, and LLM response generation for the AI Chat Tutor
- **Chat_UI**: The React-based conversational interface accessible from the student dashboard for interacting with the AI Tutor
- **RAG_Pipeline**: The Retrieval-Augmented Generation pipeline that retrieves relevant course material chunks via vector similarity search before generating LLM responses
- **Vector_Store**: The pgvector-powered table (`course_material_embeddings`) in Supabase PostgreSQL that stores chunked course material text and their embedding vectors
- **Embedding_Service**: The Edge Function that generates text embeddings using OpenAI's text-embedding-ada-002 model (or equivalent) for indexing and query-time retrieval
- **Chunk**: A segment of course material text (200–500 tokens) with associated metadata (course_id, clo_ids, bloom_level, material_type) stored in the Vector_Store
- **Conversation**: A sequence of messages between a Student and the Tutor_Engine, persisted in the `tutor_conversations` table with a unique conversation_id
- **Message**: A single turn in a Conversation, stored in the `tutor_messages` table with role (user or assistant), content, and optional source citations
- **Persona**: A named AI tutor personality (e.g., "Socratic Guide", "Step-by-Step Coach", "Quick Explainer") that adjusts the system prompt tone and pedagogical approach
- **Source_Citation**: A reference to a specific course material Chunk included in an assistant Message, enabling the student to trace the answer back to course content
- **Tutor_Analytics**: The anonymized, aggregate usage statistics (total conversations, messages per CLO, topic frequency, satisfaction ratings) visible to Teachers
- **Course_Material**: Any document, file, or text content uploaded to a course (PDFs, slides, assignment descriptions, lecture notes) that is indexed into the Vector_Store
- **Similarity_Search**: A pgvector cosine similarity query that retrieves the top-K most relevant Chunks for a given query embedding
- **System_Prompt**: The dynamically constructed prompt sent to the LLM that includes the student's CLO attainment context, Bloom's level, retrieved Chunks, and Persona instructions
- **OpenRouter**: The API gateway used to route LLM requests to OpenAI or DeepSeek models from Edge Functions
- **Satisfaction_Rating**: A per-message thumbs-up/thumbs-down rating provided by the Student to indicate response helpfulness
- **Autonomy_Level**: A classification (L1–L3) defining how much direct help the AI provides — L1 (hints only), L2 (guided discovery), L3 (direct explanation)
- **Learning_Plan_Update**: An AI-generated suggestion to adjust study time, resources, or planner sessions based on accumulated tutor interaction patterns for a specific CLO
- **Persona_Auto_Selection**: Automatic AI persona recommendation based on the student's Big Five personality profile from onboarding
- **Independence_Nudge**: A system prompt injection triggered after 3 consecutive questions on the same topic within a session, encouraging the student to attempt the problem independently
- **Independence_Score**: A metric tracking the ratio of AI-assisted vs. independent work per CLO, displayed alongside attainment data
- **Teacher_Handoff**: A mechanism for escalating AI tutor conversations to the human teacher when the AI detects it cannot help effectively (low RAG confidence, repeated questions, declining satisfaction)

## Requirements

### SECTION A: RAG Pipeline & Vector Store

#### Requirement 1: Course Material Embedding and Indexing

**User Story:** As a Teacher, I want course materials to be automatically chunked and indexed into a vector store when I upload them, so that the AI Tutor can reference actual course content in its responses.

##### Acceptance Criteria

1. WHEN a Teacher uploads a course material (PDF, DOCX, or plain text) to a course, THE Embedding_Service SHALL chunk the document into segments of 200–500 tokens with 50-token overlap between consecutive Chunks.
2. WHEN the Embedding_Service processes a Chunk, THE Embedding_Service SHALL generate a vector embedding using the text-embedding-ada-002 model and store the Chunk text, embedding vector, and metadata (course_id, clo_ids, bloom_level, material_type, source_filename) in the Vector_Store.
3. WHEN a Teacher uploads a document exceeding 100 pages, THE Embedding_Service SHALL process the document asynchronously and notify the Teacher via the Notification_Service upon completion.
4. IF the Embedding_Service fails to process a document (invalid format, API error), THEN THE Embedding_Service SHALL log the error, mark the material as `indexing_failed` in the Vector_Store, and notify the Teacher with a descriptive error message.
5. THE Vector_Store SHALL use the pgvector extension with an IVFFlat or HNSW index on the embedding column to enable sub-200ms similarity searches across up to 100,000 Chunks per institution.

---

#### Requirement 2: Assignment Description Auto-Indexing

**User Story:** As the system, I want assignment descriptions and rubric criteria to be automatically indexed into the vector store, so that the AI Tutor can reference specific assignment requirements when helping students.

##### Acceptance Criteria

1. WHEN a Teacher creates or updates an assignment, THE Embedding_Service SHALL automatically generate Chunks from the assignment title, description, and linked rubric criteria text.
2. WHEN a Teacher creates or updates a rubric, THE Embedding_Service SHALL re-index the rubric criteria text with metadata linking to the associated CLO.
3. THE auto-indexed Chunks SHALL include metadata: `material_type = 'assignment_description'` or `material_type = 'rubric_criteria'`, `course_id`, and `clo_ids` from the assignment's CLO weights.

---

#### Requirement 3: Vector Similarity Search

**User Story:** As the system, I want to retrieve the most relevant course material chunks for a student's question, so that the AI Tutor's responses are grounded in actual course content.

##### Acceptance Criteria

1. WHEN the Tutor_Engine receives a student message, THE RAG_Pipeline SHALL generate an embedding for the query text and perform a cosine Similarity_Search against the Vector_Store.
2. THE Similarity_Search SHALL return the top 5 most relevant Chunks, filtered by the student's enrolled course_ids and optionally by specific clo_ids when the conversation is CLO-scoped.
3. THE Similarity_Search SHALL exclude Chunks with a cosine similarity score below 0.7 to avoid irrelevant context injection.
4. THE Similarity_Search SHALL complete within 200ms for up to 100,000 Chunks per institution.

---

#### Requirement 4: Course Material Re-Indexing

**User Story:** As a Teacher, I want to re-index course materials when I update or replace them, so that the AI Tutor always references the latest content.

##### Acceptance Criteria

1. WHEN a Teacher replaces or updates a course material file, THE Embedding_Service SHALL delete the old Chunks for that source file and re-index the updated content.
2. WHEN a Teacher deletes a course material, THE Embedding_Service SHALL remove all associated Chunks from the Vector_Store.
3. THE Embedding_Service SHALL preserve conversation history references to deleted Chunks by retaining the Chunk text in existing Message source citations (soft reference).

---

### SECTION B: AI Tutor Conversation Engine

#### Requirement 5: Conversation Creation and Context Assembly

**User Story:** As a Student, I want to start a new tutoring conversation that is aware of my CLO progress and competency gaps, so that the AI Tutor gives me personalized help.

##### Acceptance Criteria

1. WHEN a Student starts a new conversation, THE Tutor_Engine SHALL create a `tutor_conversations` record with the student_id, course_id (if course-scoped), and selected Persona.
2. WHEN assembling the System_Prompt, THE Tutor_Engine SHALL include: the student's current CLO attainment percentages for the scoped course, the Bloom's taxonomy level of each CLO, and any CLOs with attainment below 70% (flagged as competency gaps).
3. WHEN assembling the System_Prompt, THE Tutor_Engine SHALL include the top 5 retrieved Chunks from the RAG_Pipeline as grounding context.
4. THE System_Prompt SHALL instruct the LLM to reference only the provided course materials and to clearly state when a question falls outside the available content.

---

#### Requirement 6: Message Exchange and Streaming

**User Story:** As a Student, I want to send messages and receive AI responses in real time, so that the tutoring experience feels conversational and responsive.

##### Acceptance Criteria

1. WHEN a Student sends a message, THE Chat_UI SHALL display the message immediately and show a typing indicator while the Tutor_Engine processes the response.
2. THE Tutor_Engine SHALL stream the LLM response token-by-token to the Chat_UI via server-sent events (SSE) from the Edge Function, so that the student sees the response as it is generated.
3. WHEN the Tutor_Engine completes a response, THE Tutor_Engine SHALL persist both the user message and assistant message to the `tutor_messages` table with role, content, source_citations (array of Chunk references), and token counts.
4. THE Tutor_Engine SHALL include the last 10 messages of the current conversation as context in each LLM request to support follow-up questions.
5. IF the LLM API returns an error or times out after 30 seconds, THEN THE Tutor_Engine SHALL display a user-friendly error message in the Chat_UI and offer a retry option.

---

#### Requirement 7: Multi-Persona Tutor Selection

**User Story:** As a Student, I want to choose from different AI tutor personas, so that I can pick a tutoring style that matches my learning preference.

##### Acceptance Criteria

1. THE Chat_UI SHALL offer at least 3 Personas at conversation start: "Socratic Guide" (asks probing questions to lead the student to the answer), "Step-by-Step Coach" (breaks down problems into sequential steps), and "Quick Explainer" (gives concise, direct explanations).
2. WHEN a Student selects a Persona, THE Tutor_Engine SHALL adjust the System_Prompt to reflect the selected Persona's pedagogical approach and tone.
3. THE Student SHALL be able to switch Persona mid-conversation, and THE Tutor_Engine SHALL apply the new Persona from the next response onward without losing conversation history.

---

#### Requirement 8: Source Citation Display

**User Story:** As a Student, I want to see which course materials the AI Tutor referenced in its answer, so that I can verify the information and study the original content.

##### Acceptance Criteria

1. WHEN an assistant Message includes Source_Citations, THE Chat_UI SHALL display clickable citation markers (e.g., [1], [2]) inline within the response text.
2. WHEN a Student clicks a citation marker, THE Chat_UI SHALL expand a panel showing the source Chunk text, source filename, and material type.
3. THE Chat_UI SHALL display a "Sources" section below each assistant message listing all referenced materials with their relevance context.

---

#### Requirement 9: Conversation History and Continuity

**User Story:** As a Student, I want to access my past tutoring conversations, so that I can review previous explanations and continue where I left off.

##### Acceptance Criteria

1. THE Chat_UI SHALL display a sidebar listing the student's past conversations, ordered by most recent activity, with a preview of the first message.
2. WHEN a Student selects a past conversation, THE Chat_UI SHALL load the full message history and allow the student to continue the conversation.
3. THE Platform SHALL retain conversation history for 12 months, after which conversations are archived and no longer accessible from the Chat_UI.
4. THE Student SHALL be able to delete individual conversations, and THE Platform SHALL hard-delete the conversation and all associated messages from the database.

---

#### Requirement 10: Contextual Tutor Entry Points

**User Story:** As a Student, I want to launch the AI Tutor from contextual locations (assignment page, CLO progress bar, grade notification), so that I get help relevant to what I am currently working on.

##### Acceptance Criteria

1. WHEN a Student clicks "Ask Tutor" on an assignment detail page, THE Chat_UI SHALL open a new conversation pre-scoped to that assignment's linked CLOs and pre-load relevant assignment material Chunks.
2. WHEN a Student clicks "Get Help" on a CLO progress bar showing attainment below 70%, THE Chat_UI SHALL open a new conversation focused on that specific CLO with the System_Prompt highlighting the competency gap.
3. WHEN a Student receives a grade notification for a low-scoring submission, THE Notification_Service SHALL include an "Ask Tutor" deep link that opens a conversation pre-loaded with the rubric feedback and CLO context.

---

### SECTION C: Multi-Format Input

#### Requirement 11: Text and Image Input

**User Story:** As a Student, I want to send text messages and attach images (e.g., photos of handwritten work, diagrams, screenshots) to the AI Tutor, so that I can get help with visual content.

##### Acceptance Criteria

1. THE Chat_UI SHALL accept text input up to 2000 characters per message.
2. THE Chat_UI SHALL allow the Student to attach up to 2 images (JPG, PNG, max 5MB each) per message.
3. WHEN a Student attaches an image, THE Tutor_Engine SHALL include the image in the LLM request using the vision-capable model endpoint and describe the image content in the response.
4. IF the attached file exceeds the size limit or is an unsupported format, THEN THE Chat_UI SHALL display a validation error before sending.

---

#### Requirement 12: Document Upload in Chat

**User Story:** As a Student, I want to upload a document (PDF, DOCX) in the chat for the AI Tutor to analyze, so that I can get feedback on my draft work.

##### Acceptance Criteria

1. THE Chat_UI SHALL allow the Student to upload one document (PDF or DOCX, max 10MB) per message.
2. WHEN a Student uploads a document, THE Tutor_Engine SHALL extract the text content, chunk it into segments, and include the relevant segments as context in the LLM request.
3. THE Tutor_Engine SHALL NOT index student-uploaded chat documents into the course Vector_Store (student uploads are ephemeral, scoped to the conversation only).
4. IF the document text extraction fails, THEN THE Tutor_Engine SHALL inform the Student that the document could not be read and suggest re-uploading in a different format.

---

### SECTION D: Safety, Privacy, and Guardrails

#### Requirement 13: Content Safety and Academic Integrity

**User Story:** As an institution, I want the AI Tutor to refuse to provide direct assignment answers and to maintain academic integrity, so that the tutor supports learning rather than enabling cheating.

##### Acceptance Criteria

1. THE System_Prompt SHALL instruct the LLM to guide students toward understanding rather than providing complete solutions to graded assignments.
2. WHEN a Student asks the Tutor to "solve", "write", or "complete" a graded assignment, THE Tutor_Engine SHALL detect the intent and respond with a pedagogical redirect (e.g., "I can help you understand the concepts, but I cannot complete the assignment for you. Let's break down the problem together.").
3. THE Tutor_Engine SHALL log flagged academic integrity interactions to the `tutor_messages` table with a `flagged_integrity = true` metadata field for institutional review.
4. THE System_Prompt SHALL prohibit the LLM from generating content unrelated to the course subject matter, personal advice, or harmful content.

---

#### Requirement 14: Student Data Privacy in Conversations

**User Story:** As a Student, I want my individual conversations to remain private and not be readable by Teachers or Admins, so that I feel safe asking questions without judgment.

##### Acceptance Criteria

1. THE RBAC_Engine SHALL enforce RLS policies on `tutor_conversations` and `tutor_messages` such that only the owning Student can read their own conversation data.
2. Teachers SHALL NOT have access to individual student conversation content.
3. Admins SHALL NOT have access to individual student conversation content under normal operation.
4. WHERE an institution enables a compliance audit mode, THE Platform SHALL allow Admins to access conversation content only with a logged audit trail entry in the Audit_Logger documenting the access reason.

---

#### Requirement 15: Rate Limiting and Cost Control

**User Story:** As an institution, I want to control AI Tutor usage costs by enforcing per-student rate limits, so that the feature remains financially sustainable.

##### Acceptance Criteria

1. THE Tutor_Engine SHALL enforce a configurable daily message limit per student (default: 50 messages per day).
2. WHEN a Student reaches 80% of the daily limit, THE Chat_UI SHALL display a warning: "You have [N] messages remaining today."
3. WHEN a Student reaches the daily limit, THE Chat_UI SHALL disable the input field and display: "You've reached your daily message limit. It resets at midnight."
4. THE Tutor_Engine SHALL track token usage per student per day and enforce a configurable daily token budget (default: 50,000 tokens per student per day).
5. IF a single LLM request would exceed the remaining token budget, THEN THE Tutor_Engine SHALL reject the request and inform the Student.

---

### SECTION E: Teacher Analytics

#### Requirement 16: Anonymized Tutor Usage Analytics

**User Story:** As a Teacher, I want to see anonymized, aggregate AI Tutor usage analytics for my courses, so that I can identify common student struggles and adjust my teaching.

##### Acceptance Criteria

1. THE Tutor_Analytics dashboard SHALL display per-course aggregate metrics: total conversations, total messages, average messages per conversation, and average satisfaction rating.
2. THE Tutor_Analytics dashboard SHALL display a "Top Questioned CLOs" chart showing which CLOs generate the most tutor conversations, ordered by frequency.
3. THE Tutor_Analytics dashboard SHALL display a "Common Topics" word cloud or frequency list extracted from student message content (anonymized, no student identifiers).
4. THE Tutor_Analytics dashboard SHALL display a "Usage Over Time" line chart showing daily conversation count for the selected course over the past 30 days.
5. THE Tutor_Analytics SHALL NOT display any individual student names, conversation content, or per-student usage breakdowns.

---

### SECTION F: Gamification Integration

#### Requirement 17: XP Awards for Tutor Engagement

**User Story:** As a Student, I want to earn XP for meaningful AI Tutor interactions, so that using the tutor contributes to my gamification progress.

##### Acceptance Criteria

1. WHEN a Student sends at least 3 messages in a single conversation (indicating meaningful engagement), THE XP_Engine SHALL award 15 XP for that conversation (once per conversation).
2. WHEN a Student rates a tutor response with a Satisfaction_Rating, THE XP_Engine SHALL award 5 XP per rating (max 3 ratings per day eligible for XP).
3. THE XP_Engine SHALL log tutor-related XP awards as `xp_transactions` with `source = 'tutor_engagement'` and `reference_id` pointing to the conversation_id.
4. THE Adaptive_XP_Engine diminishing returns rules SHALL apply to tutor engagement XP (reduced XP after 5 conversations in a rolling 24-hour window).

---

### SECTION G: Non-Functional Requirements

#### Requirement 18: Performance

**User Story:** As a Student, I want the AI Tutor to respond quickly, so that the tutoring experience feels natural and does not interrupt my learning flow.

##### Acceptance Criteria

1. THE Tutor_Engine SHALL return the first streamed token within 3 seconds of receiving a student message.
2. THE RAG_Pipeline (embedding generation + similarity search + context assembly) SHALL complete within 500ms.
3. THE Chat_UI SHALL render the conversation history (up to 100 messages) within 1 second of opening a past conversation.
4. THE Embedding_Service SHALL process a 50-page PDF document within 60 seconds.

---

#### Requirement 19: Reliability and Fallback

**User Story:** As a Student, I want the AI Tutor to handle errors gracefully, so that I am not left without help when something goes wrong.

##### Acceptance Criteria

1. IF the primary LLM provider (via OpenRouter) is unavailable, THEN THE Tutor_Engine SHALL attempt a fallback to an alternative model configured in the Edge Function environment variables.
2. IF both primary and fallback LLM providers are unavailable, THEN THE Chat_UI SHALL display: "The AI Tutor is temporarily unavailable. Please try again in a few minutes." and log the outage event.
3. THE Tutor_Engine SHALL implement retry logic with exponential backoff (max 3 retries, initial delay 1 second) for transient LLM API errors.
4. IF the Embedding_Service is unavailable during document upload, THEN THE Platform SHALL queue the indexing job and process it when the service recovers, notifying the Teacher upon completion.

---

#### Requirement 20: Security

**User Story:** As an institution, I want all AI Tutor data to be secured with the same rigor as other platform data, so that student conversations and course materials are protected.

##### Acceptance Criteria

1. THE Platform SHALL store all LLM API keys (OpenRouter API key) as Supabase Edge Function secrets, never in client-side code.
2. THE Tutor_Engine Edge Functions SHALL validate the student's JWT and verify course enrollment before processing any tutor request.
3. THE Vector_Store RLS policies SHALL ensure that Similarity_Search results are scoped to courses the requesting student is enrolled in.
4. THE Platform SHALL NOT send student PII (full name, email, student ID) to the LLM provider; the System_Prompt SHALL use only anonymized identifiers.
5. THE Platform SHALL log all LLM API calls (model used, token count, latency) to an internal monitoring table for cost tracking and anomaly detection.

---

### SECTION H: Autonomy Levels

#### Requirement 21: Explicit Autonomy Level Framework

**User Story:** As an institution, I want the AI Tutor to operate at defined autonomy levels for different interaction types, so that the level of direct help is appropriate to the learning context.

##### Acceptance Criteria

1. THE Tutor_Engine SHALL support three Autonomy_Levels: L1 (hints only — the tutor asks guiding questions and provides hints but never reveals answers), L2 (guided discovery — the tutor provides scaffolded hints and partial explanations leading the student toward understanding), and L3 (direct explanation — the tutor provides complete, direct explanations of concepts).
2. WHEN a student asks for help on a graded assignment, THE Tutor_Engine SHALL default to Autonomy_Level L1 unless the Teacher has configured a different level for that assignment.
3. WHEN a student asks for concept explanation unrelated to a graded assignment, THE Tutor_Engine SHALL default to Autonomy_Level L2.
4. WHEN a student asks for review or practice help, THE Tutor_Engine SHALL default to Autonomy_Level L3.
5. THE Tutor_Engine SHALL include the active Autonomy_Level in the System_Prompt to instruct the LLM on the appropriate level of directness.

---

#### Requirement 22: Teacher-Configurable Autonomy Levels

**User Story:** As a Teacher, I want to configure the AI Tutor's autonomy level per assignment or CLO, so that I can control how much help students receive for specific learning activities.

##### Acceptance Criteria

1. THE Platform SHALL provide a per-assignment autonomy level setting (L1, L2, or L3) in the assignment creation and edit forms, defaulting to L1.
2. THE Platform SHALL provide a per-CLO autonomy level setting in the CLO management interface, defaulting to L2.
3. WHEN both an assignment-level and a CLO-level autonomy setting exist for a conversation, THE Tutor_Engine SHALL use the assignment-level setting (more specific scope takes precedence).
4. THE Tutor_Engine SHALL log the Autonomy_Level used in each interaction to the `tutor_messages` table as metadata for analysis.

---

#### Requirement 23: Student Autonomy Toggle

**User Story:** As a Student, I want to toggle between "I want to figure this out" mode and "Just explain it" mode, so that I can control how much help I receive based on my current needs.

##### Acceptance Criteria

1. THE Chat_UI SHALL display a toggle control with two modes: "Figure it out" (maps to Autonomy_Level L1) and "Just explain it" (maps to Autonomy_Level L3).
2. WHEN a Student selects "Figure it out", THE Tutor_Engine SHALL constrain responses to hints and guiding questions only, regardless of the default Autonomy_Level.
3. WHEN a Student selects "Just explain it", THE Tutor_Engine SHALL provide direct explanations, subject to the Teacher-configured maximum Autonomy_Level for the assignment (the student toggle cannot exceed the teacher-set ceiling).
4. THE Chat_UI SHALL persist the student's toggle preference per conversation and restore it when the student returns to that conversation.

---

### SECTION I: Explainable Replans

#### Requirement 24: Learning Plan Update Generation

**User Story:** As a Student, I want the AI Tutor to proactively suggest adjustments to my learning plan based on my tutoring interactions, so that I can study more effectively.

##### Acceptance Criteria

1. WHEN a Student has completed 5 tutor interactions on the same CLO within a rolling 7-day window, THE Tutor_Engine SHALL generate a Learning_Plan_Update for that CLO.
2. THE Learning_Plan_Update SHALL include: a revised study time allocation recommendation, up to 3 specific course material sections to review (retrieved via the RAG_Pipeline), and a suggested number of weekly planner sessions for that CLO.
3. THE Chat_UI SHALL display the Learning_Plan_Update as a distinct card within the conversation, visually differentiated from regular assistant messages.
4. THE Student SHALL be able to accept, modify, or dismiss the Learning_Plan_Update via action buttons on the card.

---

#### Requirement 25: Learning Plan Update Tracking

**User Story:** As the system, I want to track student responses to learning plan suggestions, so that recommendation quality can improve over time.

##### Acceptance Criteria

1. WHEN a Student accepts, modifies, or dismisses a Learning_Plan_Update, THE Platform SHALL record the response (accepted, modified, dismissed) in a `tutor_plan_updates` table with the CLO_id, student_id, and suggestion content.
2. THE Platform SHALL calculate an acceptance rate per CLO and per student over the last 30 days.
3. WHEN the acceptance rate for a CLO falls below 30% over the last 10 suggestions, THE Tutor_Engine SHALL reduce the frequency of Learning_Plan_Updates for that CLO to every 10 interactions instead of every 5.

---

### SECTION J: Persona Auto-Selection

#### Requirement 26: Personality-Based Persona Auto-Selection

**User Story:** As a Student, I want the AI Tutor to automatically recommend a persona that matches my personality profile, so that I get a tutoring style suited to my learning preferences without manual selection.

##### Acceptance Criteria

1. WHEN a Student starts a new conversation and has a completed Big Five personality profile from onboarding, THE Tutor_Engine SHALL recommend a Persona based on the following mapping: students scoring high (≥70th percentile) in Openness receive "Socratic Guide", students scoring high in Conscientiousness receive "Step-by-Step Coach", and students scoring high in Neuroticism receive a more supportive, encouraging tone variant of the selected persona.
2. WHEN multiple Big Five traits score high, THE Tutor_Engine SHALL prioritize the trait with the highest percentile score for persona selection.
3. THE Chat_UI SHALL display the auto-selected persona as a recommendation with a "Change" option, allowing the Student to override the selection at any time.
4. WHEN a Student does not have a completed personality profile, THE Chat_UI SHALL fall back to the standard manual persona selection.

---

### SECTION K: AI Dependency Prevention

#### Requirement 27: Independence Nudges

**User Story:** As an institution, I want the AI Tutor to encourage independent problem-solving when it detects over-reliance, so that students develop self-sufficiency rather than learned helplessness.

##### Acceptance Criteria

1. WHEN a Student asks 3 consecutive questions on the same topic within a single conversation session, THE Tutor_Engine SHALL inject an Independence_Nudge encouraging the student to attempt the problem independently before asking again.
2. THE Independence_Nudge SHALL be a supportive, non-punitive message (e.g., "You're making good progress on this topic. Try working through the next step on your own — I believe you can do it. I'm here if you get stuck.").
3. AFTER delivering an Independence_Nudge, THE Tutor_Engine SHALL continue to accept and respond to further questions from the Student (the nudge is advisory, not blocking).
4. THE Tutor_Engine SHALL log Independence_Nudge occurrences to the `tutor_messages` table with a `nudge_type = 'independence'` metadata field.

---

#### Requirement 28: Independence Score Tracking

**User Story:** As a Student, I want to see my independence score alongside my attainment data, so that I can understand how much I rely on the AI Tutor versus working independently.

##### Acceptance Criteria

1. THE Platform SHALL calculate an Independence_Score per student per CLO, defined as: `1 - (AI-assisted submissions for CLO / total submissions for CLO)`, where an AI-assisted submission is one preceded by a tutor conversation on the same CLO within 2 hours before submission.
2. THE Student Dashboard SHALL display the Independence_Score alongside CLO attainment data as a secondary metric.
3. THE Independence_Score SHALL update after each new submission or tutor conversation.

---

#### Requirement 29: Self-Reliant Scholar Badge

**User Story:** As a Student, I want to earn a badge for improving my CLO attainment with below-average AI usage, so that independent learning is recognized and rewarded.

##### Acceptance Criteria

1. WHEN a Student's CLO attainment improves by at least 15 percentage points and the Student's Independence_Score for that CLO is above the course average, THE XP_Engine SHALL award the "Self-Reliant Scholar" badge.
2. THE "Self-Reliant Scholar" badge SHALL be a visible badge in the student's badge collection with a description: "Improved attainment through independent effort."
3. THE XP_Engine SHALL check the badge condition after each attainment rollup, idempotently (awarding only once per CLO per student).

---

### SECTION L: Teacher-AI Collaboration

#### Requirement 30: Teacher Handoff Mechanism

**User Story:** As a Student, I want the AI Tutor to suggest connecting me with my teacher when it cannot help effectively, so that I am not left without support.

##### Acceptance Criteria

1. WHEN the Tutor_Engine detects low effectiveness (average RAG similarity score below 0.7 for the last 3 responses, or the student asks the same question 3 times, or the student gives 3 consecutive thumbs-down ratings), THE Chat_UI SHALL display a "Connect with Teacher" suggestion card.
2. THE "Connect with Teacher" card SHALL explain why the handoff is suggested (e.g., "I'm having trouble finding relevant course materials for this topic. Your teacher may be able to help.").
3. WHEN the Student accepts the handoff, THE Platform SHALL create a `teacher_handoff_requests` record containing: the conversation_id, a summary of the last 5 messages (generated by the LLM), the specific CLO or topic, and a suggested intervention.
4. THE Platform SHALL require explicit student consent before sharing any conversation content with the Teacher.

---

#### Requirement 31: Teacher Handoff Dashboard

**User Story:** As a Teacher, I want to see AI tutor handoff requests and analytics about AI tutor effectiveness, so that I can intervene where the AI falls short and improve my course materials.

##### Acceptance Criteria

1. THE Teacher Dashboard SHALL include an "AI Tutor Insights" tab displaying: pending handoff requests with conversation summaries, most-asked questions across all students (anonymized), lowest-confidence responses (topics where RAG similarity scores are consistently low), and students with high AI dependency scores (Independence_Score below 0.3).
2. WHEN a Teacher views a handoff request, THE Platform SHALL display the conversation summary, CLO context, and suggested intervention without revealing the student's identity unless the student has granted consent.
3. THE Teacher SHALL be able to respond to a handoff request by sending a message to the student through the platform's existing notification system.
4. WHEN a Teacher responds to a handoff request, THE Platform SHALL mark the request as resolved and log the response in the `teacher_handoff_requests` table.

---

#### Requirement 32: AI Tutor Effectiveness Metrics for Teachers

**User Story:** As a Teacher, I want to see which topics the AI Tutor handles well and which it struggles with, so that I can upload additional materials to improve coverage.

##### Acceptance Criteria

1. THE Tutor_Analytics dashboard SHALL include a "Coverage Gaps" section listing CLOs where the average RAG similarity score across student queries is below 0.75, indicating insufficient course material coverage.
2. THE Tutor_Analytics dashboard SHALL display a "Material Effectiveness" ranking showing which uploaded course materials are most frequently cited in tutor responses, ordered by citation count.
3. WHEN a CLO appears in the "Coverage Gaps" list, THE Platform SHALL display a prompt suggesting the Teacher upload additional materials for that CLO.
