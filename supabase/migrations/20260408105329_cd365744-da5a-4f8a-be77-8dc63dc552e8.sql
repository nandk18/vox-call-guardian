ALTER TABLE calls ADD COLUMN IF NOT EXISTS bolna_call_id text;
CREATE UNIQUE INDEX IF NOT EXISTS calls_bolna_call_id_unique ON calls (bolna_call_id) WHERE bolna_call_id IS NOT NULL;