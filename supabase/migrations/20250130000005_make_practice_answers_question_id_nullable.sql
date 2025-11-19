-- Make question_id nullable in practice_answers
-- This allows storing practice answers without requiring questions to be saved to behavioral_questions
-- Migration: Allow practice_answers to exist without a question reference

-- Drop the foreign key constraint first
ALTER TABLE public.practice_answers
DROP CONSTRAINT IF EXISTS practice_answers_question_id_fkey;

-- Make question_id nullable
ALTER TABLE public.practice_answers
ALTER COLUMN question_id DROP NOT NULL;

-- Re-add the foreign key constraint but allow NULL values
ALTER TABLE public.practice_answers
ADD CONSTRAINT practice_answers_question_id_fkey
FOREIGN KEY (question_id) 
REFERENCES public.behavioral_questions(id) 
ON DELETE CASCADE;

