-- Update flashcard system to support custom solutions (user submissions)
-- Migration: Allow flashcard_decks to reference either curated solutions or custom user solutions

-- Drop the existing foreign key constraint on solution_id
ALTER TABLE public.flashcard_decks 
DROP CONSTRAINT IF EXISTS flashcard_decks_solution_id_fkey;

-- Add new columns to support custom solutions
ALTER TABLE public.flashcard_decks 
ADD COLUMN IF NOT EXISTS solution_code TEXT,
ADD COLUMN IF NOT EXISTS solution_title TEXT DEFAULT 'Your Solution';

-- Update the constraint to make solution_id nullable for custom solutions
ALTER TABLE public.flashcard_decks 
ALTER COLUMN solution_id DROP NOT NULL;

-- Add a check constraint to ensure either solution_id OR solution_code is provided
ALTER TABLE public.flashcard_decks 
ADD CONSTRAINT check_solution_source 
CHECK (
  (solution_id IS NOT NULL AND solution_code IS NULL) OR 
  (solution_id IS NULL AND solution_code IS NOT NULL)
);

-- Add index for performance on solution queries
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_solution_type 
ON public.flashcard_decks(problem_id, solution_id) 
WHERE solution_id IS NOT NULL;

-- Update the helper function to handle custom solutions
CREATE OR REPLACE FUNCTION get_cards_due_for_review(p_user_id UUID)
RETURNS TABLE (
    deck_id UUID,
    problem_id TEXT,
    problem_title TEXT,
    solution_title TEXT,
    solution_code TEXT,
    next_review_date DATE,
    mastery_level INTEGER,
    review_count INTEGER,
    days_overdue INTEGER,
    is_custom_solution BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fd.id as deck_id,
        fd.problem_id,
        p.title as problem_title,
        COALESCE(ps.title, fd.solution_title) as solution_title,
        COALESCE(ps.code, fd.solution_code) as solution_code,
        fd.next_review_date,
        fd.mastery_level,
        fd.review_count,
        (CURRENT_DATE - fd.next_review_date)::INTEGER as days_overdue,
        (fd.solution_id IS NULL) as is_custom_solution
    FROM public.flashcard_decks fd
    JOIN public.problems p ON fd.problem_id = p.id
    LEFT JOIN public.problem_solutions ps ON fd.solution_id = ps.id
    WHERE fd.user_id = p_user_id 
      AND fd.next_review_date <= CURRENT_DATE
    ORDER BY fd.next_review_date ASC, fd.created_at ASC;
END;
$$;

-- Add comment explaining the new structure
COMMENT ON COLUMN public.flashcard_decks.solution_code IS 'Custom solution code for user submissions (mutually exclusive with solution_id)';
COMMENT ON COLUMN public.flashcard_decks.solution_title IS 'Title for custom solutions, defaults to "Your Solution"';
COMMENT ON CONSTRAINT check_solution_source ON public.flashcard_decks IS 'Ensures either curated solution_id OR custom solution_code is provided, not both';