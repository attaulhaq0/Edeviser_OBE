CREATE TABLE sale_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage BETWEEN 5 AND 90),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sale_event_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_sale_events_institution ON sale_events(institution_id);
CREATE INDEX idx_sale_events_active ON sale_events(institution_id, start_date, end_date);

ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;;
