-- Fix database function return type by dropping and recreating
-- Migration: Drop and recreate get_cards_due_for_review function with correct return type

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_cards_due_for_review(UUID);

-- Recreate the helper function with the correct return type including custom solution support
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

-- Add comment explaining the function
COMMENT ON FUNCTION get_cards_due_for_review(UUID) IS 'Returns flashcards that are due for review for a given user, supporting both curated and custom solutions';