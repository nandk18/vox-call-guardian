
-- Create agents table
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name text,
  industry text,
  language_primary text DEFAULT 'hindi',
  language_auto_detect boolean DEFAULT true,
  greeting text DEFAULT 'Thank you for calling {{business_name}}, how can I help you today?',
  voice text DEFAULT 'female_hindi',
  talk_speed text DEFAULT 'natural',
  phone_number text,
  bolna_agent_id text,
  owner_whatsapp text,
  owner_mobile text,
  status text DEFAULT 'inactive',
  onboarding_complete boolean DEFAULT false,
  trial_ends_at timestamptz DEFAULT now() + interval '14 days',
  created_at timestamptz DEFAULT now()
);

-- Create knowledge table
CREATE TABLE public.knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  faq text,
  services text,
  hours text,
  address text,
  extra_notes text,
  updated_at timestamptz DEFAULT now()
);

-- Create calls table
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  caller_number text,
  duration_secs integer DEFAULT 0,
  outcome text DEFAULT 'no_response',
  transcript jsonb DEFAULT '[]'::jsonb,
  summary text,
  caller_name text,
  caller_need text,
  is_read boolean DEFAULT false,
  recording_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- RLS policies for agents
CREATE POLICY "Users can view own agents" ON public.agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agents" ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own agents" ON public.agents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own agents" ON public.agents
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for knowledge (via agent ownership)
CREATE POLICY "Users can view own knowledge" ON public.knowledge
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own knowledge" ON public.knowledge
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own knowledge" ON public.knowledge
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own knowledge" ON public.knowledge
  FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- RLS policies for calls (via agent ownership)
CREATE POLICY "Users can view own calls" ON public.calls
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own calls" ON public.calls
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own calls" ON public.calls
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own calls" ON public.calls
  FOR DELETE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
