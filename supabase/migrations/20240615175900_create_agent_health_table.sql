CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create agent_health table for Agent Status Tracking
CREATE TABLE agent_health (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  agent_name TEXT NOT NULL UNIQUE,
  last_seen TIMESTAMPTZ NOT NULL,
  current_task TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for auto-updating updated_at column
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW; 
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_agent_health_modtime 
BEFORE UPDATE ON agent_health 
FOR EACH ROW 
EXECUTE FUNCTION update_modified_column();