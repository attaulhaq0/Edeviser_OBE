ALTER TABLE question_bank ADD COLUMN explanation_confidence NUMERIC(3,2) CHECK (
  explanation_confidence IS NULL OR (explanation_confidence BETWEEN 0.0 AND 1.0)
);

COMMENT ON COLUMN question_bank.explanation_confidence IS 'Average RAG similarity score of top 3 chunks used to generate the AI explanation. NULL when not yet computed. Values 0.0-1.0.';;
