-- Create behavioral interview system tables
-- Migration: Create tables for behavioral interview prep MVP

-- Behavioral questions - curated technical behavioral questions
CREATE TABLE IF NOT EXISTS public.behavioral_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    category TEXT[] NOT NULL DEFAULT '{}', -- Array of categories (technical_leadership, debugging, etc.)
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    follow_up_questions JSONB DEFAULT '[]', -- Array of related questions
    key_traits TEXT[] DEFAULT '{}', -- What interviewers are looking for
    related_question_ids UUID[] DEFAULT '{}', -- References to other questions
    company_associations TEXT[] DEFAULT '{}', -- Which companies ask this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stories - personal experience bank
CREATE TABLE IF NOT EXISTS public.user_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    situation TEXT NOT NULL,
    task TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}', -- technical_leadership, debugging, etc.
    technical_skills TEXT[] DEFAULT '{}', -- system_design, performance_optimization, etc.
    technologies TEXT[] DEFAULT '{}', -- React, PostgreSQL, AWS, etc.
    metrics TEXT, -- Quantifiable results (e.g., "reduced latency by 40%")
    related_problem_ids TEXT[] DEFAULT '{}', -- Links to problems table if applicable
    versatility_score INTEGER DEFAULT 0, -- Calculated: how many question types it can answer
    last_used_at TIMESTAMP WITH TIME ZONE,
    practice_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('guided', 'mock', 'company_specific')),
    company_id UUID, -- References company_profiles if company-specific
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER DEFAULT 0,
    average_score NUMERIC(5,2) -- Average overall score across all answers
);

-- Practice answers - individual answers within a session
CREATE TABLE IF NOT EXISTS public.practice_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.behavioral_questions(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL, -- Which story they used
    answer_text TEXT NOT NULL,
    answer_audio_url TEXT, -- If voice recorded
    transcript TEXT, -- Transcript if voice recorded
    time_spent_seconds INTEGER,
    star_score JSONB DEFAULT '{}', -- {situation: 85, task: 90, action: 75, result: 80}
    content_score INTEGER CHECK (content_score >= 0 AND content_score <= 100),
    delivery_score INTEGER CHECK (delivery_score >= 0 AND delivery_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    feedback JSONB DEFAULT '{}', -- Detailed feedback object
    revision_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavioral statistics
CREATE TABLE IF NOT EXISTS public.user_behavioral_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_questions_practiced INTEGER DEFAULT 0,
    total_stories_created INTEGER DEFAULT 0,
    average_overall_score NUMERIC(5,2),
    category_scores JSONB DEFAULT '{}', -- {technical_leadership: 85, debugging: 72, ...}
    practice_streak INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavioral_questions_category ON public.behavioral_questions USING gin(category);
CREATE INDEX IF NOT EXISTS idx_behavioral_questions_difficulty ON public.behavioral_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_behavioral_questions_company ON public.behavioral_questions USING gin(company_associations);

CREATE INDEX IF NOT EXISTS idx_user_stories_user_id ON public.user_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_tags ON public.user_stories USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_user_stories_technical_skills ON public.user_stories USING gin(technical_skills);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_started_at ON public.practice_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_practice_answers_session_id ON public.practice_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id ON public.practice_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_story_id ON public.practice_answers(story_id);

-- Row Level Security (RLS)
ALTER TABLE public.behavioral_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavioral_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for behavioral_questions (public read, admin write)
CREATE POLICY "Anyone can view behavioral questions" ON public.behavioral_questions
    FOR SELECT USING (true);

-- RLS Policies for user_stories
CREATE POLICY "Users can view their own stories" ON public.user_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON public.user_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.user_stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.user_stories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view their own practice sessions" ON public.practice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions" ON public.practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions" ON public.practice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for practice_answers
CREATE POLICY "Users can view their own practice answers" ON public.practice_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions 
            WHERE id = practice_answers.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own practice answers" ON public.practice_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.practice_sessions 
            WHERE id = practice_answers.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own practice answers" ON public.practice_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions 
            WHERE id = practice_answers.session_id 
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for user_behavioral_stats
CREATE POLICY "Users can view their own stats" ON public.user_behavioral_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON public.user_behavioral_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.user_behavioral_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_behavioral_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_behavioral_questions_updated_at
    BEFORE UPDATE ON public.behavioral_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_behavioral_updated_at();

CREATE TRIGGER update_user_stories_updated_at
    BEFORE UPDATE ON public.user_stories
    FOR EACH ROW
    EXECUTE FUNCTION update_behavioral_updated_at();

CREATE TRIGGER update_practice_answers_updated_at
    BEFORE UPDATE ON public.practice_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_behavioral_updated_at();

CREATE TRIGGER update_user_behavioral_stats_updated_at
    BEFORE UPDATE ON public.user_behavioral_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_behavioral_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.behavioral_questions IS 'Curated technical behavioral interview questions';
COMMENT ON TABLE public.user_stories IS 'User personal experience bank structured with STAR method';
COMMENT ON TABLE public.practice_sessions IS 'Practice session tracking for behavioral interviews';
COMMENT ON TABLE public.practice_answers IS 'Individual answers with AI feedback and scoring';
COMMENT ON TABLE public.user_behavioral_stats IS 'User progress and statistics for behavioral interview prep';

