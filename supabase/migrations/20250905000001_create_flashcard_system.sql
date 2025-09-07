-- Create flashcard system tables
-- Migration: Create flashcard decks and reviews tables for spaced repetition system

-- Flashcard decks - one entry per problem added to flashcards
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
    solution_id UUID NOT NULL REFERENCES public.problem_solutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 3), -- 0=new, 1=learning, 2=good, 3=mastered
    review_count INTEGER DEFAULT 0,
    ease_factor DECIMAL(3,2) DEFAULT 2.50 CHECK (ease_factor >= 1.30), -- Anki-style ease factor
    interval_days INTEGER DEFAULT 1 CHECK (interval_days >= 1),
    UNIQUE(user_id, problem_id)
);

-- Individual review sessions with AI interaction
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_questions JSONB NOT NULL DEFAULT '[]', -- Array of questions asked by AI
    user_answers JSONB NOT NULL DEFAULT '[]', -- Array of user responses
    ai_evaluation JSONB DEFAULT NULL, -- AI's assessment of understanding
    user_difficulty_rating INTEGER NOT NULL CHECK (user_difficulty_rating >= 1 AND user_difficulty_rating <= 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
    time_spent_seconds INTEGER,
    notes TEXT -- Optional user notes from the session
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON public.flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_next_review ON public.flashcard_decks(next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_due ON public.flashcard_decks(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_deck_id ON public.flashcard_reviews(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_reviewed_at ON public.flashcard_reviews(reviewed_at);

-- Row Level Security (RLS)
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcard_decks
CREATE POLICY "Users can view their own flashcard decks" ON public.flashcard_decks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard decks" ON public.flashcard_decks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard decks" ON public.flashcard_decks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard decks" ON public.flashcard_decks
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for flashcard_reviews
CREATE POLICY "Users can view their own flashcard reviews" ON public.flashcard_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = flashcard_reviews.deck_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own flashcard reviews" ON public.flashcard_reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = flashcard_reviews.deck_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own flashcard reviews" ON public.flashcard_reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = flashcard_reviews.deck_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own flashcard reviews" ON public.flashcard_reviews
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = flashcard_reviews.deck_id 
            AND user_id = auth.uid()
        )
    );

-- Helper function to get cards due for review
CREATE OR REPLACE FUNCTION get_cards_due_for_review(p_user_id UUID)
RETURNS TABLE (
    deck_id UUID,
    problem_id TEXT,
    problem_title TEXT,
    solution_title TEXT,
    next_review_date DATE,
    mastery_level INTEGER,
    review_count INTEGER,
    days_overdue INTEGER
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
        ps.title as solution_title,
        fd.next_review_date,
        fd.mastery_level,
        fd.review_count,
        (CURRENT_DATE - fd.next_review_date)::INTEGER as days_overdue
    FROM public.flashcard_decks fd
    JOIN public.problems p ON fd.problem_id = p.id
    JOIN public.problem_solutions ps ON fd.solution_id = ps.id
    WHERE fd.user_id = p_user_id 
      AND fd.next_review_date <= CURRENT_DATE
    ORDER BY fd.next_review_date ASC, fd.created_at ASC;
END;
$$;

-- Helper function to update flashcard scheduling after review
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
    new_interval INTEGER;
    new_ease DECIMAL(3,2);
    new_mastery INTEGER;
BEGIN
    -- Get current values
    SELECT interval_days, ease_factor, mastery_level 
    INTO current_interval, current_ease, new_mastery
    FROM public.flashcard_decks 
    WHERE id = p_deck_id;
    
    -- Calculate new values based on SM-2 algorithm
    CASE p_difficulty_rating
        WHEN 1 THEN -- Again - didn't remember well
            new_interval := 1;
            new_ease := GREATEST(1.30, current_ease - 0.20);
            new_mastery := GREATEST(0, new_mastery - 1);
        WHEN 2 THEN -- Hard - remembered with effort
            new_interval := GREATEST(1, ROUND(current_interval * current_ease * 0.8));
            new_ease := GREATEST(1.30, current_ease - 0.15);
        WHEN 3 THEN -- Good - remembered well
            new_interval := ROUND(current_interval * current_ease);
            new_mastery := LEAST(3, new_mastery + 1);
        WHEN 4 THEN -- Easy - remembered perfectly
            new_interval := ROUND(current_interval * current_ease * 1.3);
            new_ease := current_ease + 0.10;
            new_mastery := LEAST(3, new_mastery + 1);
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

-- Comments for documentation
COMMENT ON TABLE public.flashcard_decks IS 'Stores flashcard entries for spaced repetition learning of problem solutions';
COMMENT ON TABLE public.flashcard_reviews IS 'Tracks individual review sessions with AI conversations and user performance';
COMMENT ON FUNCTION get_cards_due_for_review(UUID) IS 'Returns flashcards that are due for review for a given user';
COMMENT ON FUNCTION update_flashcard_schedule(UUID, INTEGER) IS 'Updates flashcard scheduling based on user difficulty rating using SM-2 algorithm';