-- Add support for custom user questions and evaluation criteria
-- Migration: Add user_id and evaluation criteria to behavioral_questions

-- Add user_id column (NULL for curated questions, user_id for custom questions)
ALTER TABLE public.behavioral_questions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add evaluation criteria fields
ALTER TABLE public.behavioral_questions
ADD COLUMN IF NOT EXISTS evaluation_type TEXT DEFAULT 'star' CHECK (evaluation_type IN ('star', 'none', 'custom')),
ADD COLUMN IF NOT EXISTS custom_evaluation_prompt TEXT;

-- Add constraint: custom_evaluation_prompt can only be set if evaluation_type is 'custom'
ALTER TABLE public.behavioral_questions
ADD CONSTRAINT check_custom_prompt 
CHECK (
  (evaluation_type = 'custom' AND custom_evaluation_prompt IS NOT NULL AND LENGTH(TRIM(custom_evaluation_prompt)) > 0) OR
  (evaluation_type != 'custom')
);

-- Add constraint: custom_evaluation_prompt has word limit (500 words max)
-- We'll enforce this in the application layer, but add a length check
ALTER TABLE public.behavioral_questions
ADD CONSTRAINT check_prompt_length 
CHECK (
  custom_evaluation_prompt IS NULL OR 
  LENGTH(custom_evaluation_prompt) <= 5000 -- ~500 words at ~10 chars/word
);

-- Create index for user questions
CREATE INDEX IF NOT EXISTS idx_behavioral_questions_user_id ON public.behavioral_questions(user_id);

-- Update RLS to allow users to see curated questions (user_id IS NULL) and their own custom questions
-- Curated questions are already public (existing policy allows SELECT for all)
-- Add policy for users to manage their own custom questions
CREATE POLICY "Users can insert their own custom questions" ON public.behavioral_questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom questions" ON public.behavioral_questions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom questions" ON public.behavioral_questions
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON COLUMN public.behavioral_questions.user_id IS 'NULL for curated questions, user_id for custom user-created questions';
COMMENT ON COLUMN public.behavioral_questions.evaluation_type IS 'Evaluation method: star (STAR method), none (no specific criteria), or custom (user-defined prompt)';
COMMENT ON COLUMN public.behavioral_questions.custom_evaluation_prompt IS 'Custom evaluation prompt (max 500 words) when evaluation_type is custom';

