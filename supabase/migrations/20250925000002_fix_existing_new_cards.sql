-- Fix existing cards that have been reviewed but are still marked as "New"
-- Migration: Update mastery level for cards that have review_count > 0 but mastery_level = 0

-- Update cards that have been reviewed at least once but are still marked as "New"
UPDATE public.flashcard_decks 
SET mastery_level = 1 -- Move to "Learning" status
WHERE mastery_level = 0 -- Currently "New"
  AND review_count > 0; -- But have been reviewed

-- Add a comment explaining what this migration does
COMMENT ON TABLE public.flashcard_decks IS 'Stores flashcard entries for spaced repetition learning of problem solutions. Updated to ensure reviewed cards are not marked as New.';