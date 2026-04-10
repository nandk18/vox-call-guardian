CREATE TABLE IF NOT EXISTS integrations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  type text not null,
  api_key text,
  event_type_id text,
  event_type_name text,
  timezone text default 'Asia/Kolkata',
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own integrations"
ON integrations FOR SELECT
USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own integrations"
ON integrations FOR INSERT
WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own integrations"
ON integrations FOR UPDATE
USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own integrations"
ON integrations FOR DELETE
USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));