ALTER TABLE knowledge DROP CONSTRAINT IF EXISTS knowledge_agent_id_unique;
ALTER TABLE knowledge ADD CONSTRAINT knowledge_agent_id_unique UNIQUE (agent_id);