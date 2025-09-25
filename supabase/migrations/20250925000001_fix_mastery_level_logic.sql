-- Fix mastery level logic in update_flashcard_schedule function
-- Migration: Ensure cards move from "New" status after first review

CREATE OR REPLACE FUNCTION update_flashcard_schedule(
    p_deck_id UUID,
    p_difficulty_rating INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_interval INTEGER;
    current_ease DECIMAL(3,2);
    current_mastery INTEGER;
    new_interval INTEGER;
    new_ease DECIMAL(3,2);
    new_mastery INTEGER;
BEGIN
    -- Get current values
    SELECT interval_days, ease_factor, mastery_level 
    INTO current_interval, current_ease, current_mastery
    FROM public.flashcard_decks 
    WHERE id = p_deck_id;
    
    -- Calculate new values based on SM-2 algorithm
    CASE p_difficulty_rating
        WHEN 1 THEN -- Again - didn't remember well
            new_interval := 1;
            new_ease := GREATEST(1.30, current_ease - 0.20);
            -- If it was new (0), move to learning (1), otherwise decrease but don't go below 1
            new_mastery := CASE 
                WHEN current_mastery = 0 THEN 1 
                ELSE GREATEST(1, current_mastery - 1) 
            END;
        WHEN 2 THEN -- Hard - remembered with effort
            new_interval := GREATEST(1, ROUND(current_interval * current_ease * 0.8));
            new_ease := GREATEST(1.30, current_ease - 0.15);
            -- Move from new (0) to learning (1), otherwise stay at current level
            new_mastery := CASE 
                WHEN current_mastery = 0 THEN 1 
                ELSE current_mastery 
            END;
        WHEN 3 THEN -- Good - remembered well
            new_interval := ROUND(current_interval * current_ease);
            new_ease := current_ease; -- No change to ease factor for "Good"
            new_mastery := LEAST(3, current_mastery + 1);
        WHEN 4 THEN -- Easy - remembered perfectly
            new_interval := ROUND(current_interval * current_ease * 1.3);
            new_ease := current_ease + 0.10;
            new_mastery := LEAST(3, current_mastery + 1);
    END CASE;
    
    -- Update the flashcard deck
    UPDATE public.flashcard_decks SET
        last_reviewed_at = NOW(),
        next_review_date = CURRENT_DATE + new_interval,
        mastery_level = new_mastery,
        review_count = review_count + 1,
        ease_factor = new_ease,
        interval_days = new_interval
    WHERE id = p_deck_id;
END;
$$;

-- Add comment explaining the updated function
COMMENT ON FUNCTION update_flashcard_schedule(UUID, INTEGER) IS 'Updates flashcard scheduling based on user difficulty rating using SM-2 algorithm. Ensures cards move from New (0) to Learning (1) after first review regardless of rating.';