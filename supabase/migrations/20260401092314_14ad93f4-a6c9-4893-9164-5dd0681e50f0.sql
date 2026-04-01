ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS vox_number text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS compiled_prompt text;