-- Add custom solution support to flashcard_decks
-- Migration: Allow storing custom solutions (like user submissions) alongside curated solutions

-- Add columns for custom solution support
ALTER TABLE public.flashcard_decks 
ADD COLUMN solution_title TEXT,
ADD COLUMN solution_code TEXT;

-- Make solution_id nullable since custom solutions won't have a solution_id
ALTER TABLE public.flashcard_decks 
ALTER COLUMN solution_id DROP NOT NULL;

-- Add constraint to ensure either solution_id OR both custom fields are provided
ALTER TABLE public.flashcard_decks
ADD CONSTRAINT flashcard_decks_solution_check 
CHECK (
  (solution_id IS NOT NULL) OR 
  (solution_title IS NOT NULL AND solution_code IS NOT NULL)
);

-- Update unique constraint to allow multiple cards per problem if they have different solutions
-- (e.g., one curated solution and one custom solution for the same problem)
ALTER TABLE public.flashcard_decks 
DROP CONSTRAINT IF EXISTS flashcard_decks_user_id_problem_id_key;

-- Create new composite unique constraint that includes solution identification
CREATE UNIQUE INDEX flashcard_decks_unique_solution 
ON public.flashcard_decks (user_id, problem_id, COALESCE(solution_id::TEXT, solution_title));

-- Add comment explaining the new structure
COMMENT ON COLUMN public.flashcard_decks.solution_title IS 'Title for custom solutions (null for curated solutions)';
COMMENT ON COLUMN public.flashcard_decks.solution_code IS 'Code for custom solutions (null for curated solutions)';