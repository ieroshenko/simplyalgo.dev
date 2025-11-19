-- Create separate tables for mock interviews
-- This separates mock interview workflow from regular practice sessions

-- Mock interviews table
CREATE TABLE IF NOT EXISTS public.mock_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_text TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mock interview answers table
CREATE TABLE IF NOT EXISTS public.mock_interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_interview_id UUID NOT NULL REFERENCES public.mock_interviews(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_category TEXT[],
    question_difficulty TEXT,
    answer_text TEXT NOT NULL,
    star_score JSONB DEFAULT '{}',
    content_score INTEGER CHECK (content_score >= 0 AND content_score <= 100),
    delivery_score INTEGER CHECK (delivery_score >= 0 AND delivery_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    feedback JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mock_interviews_user_id ON public.mock_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_started_at ON public.mock_interviews(started_at);
CREATE INDEX IF NOT EXISTS idx_mock_interview_answers_mock_interview_id ON public.mock_interview_answers(mock_interview_id);

-- Enable RLS
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_interviews
CREATE POLICY "Users can view their own mock interviews" ON public.mock_interviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mock interviews" ON public.mock_interviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mock interviews" ON public.mock_interviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mock interviews" ON public.mock_interviews
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mock_interview_answers
CREATE POLICY "Users can view their own mock interview answers" ON public.mock_interview_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.mock_interviews
            WHERE mock_interviews.id = mock_interview_answers.mock_interview_id
            AND mock_interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own mock interview answers" ON public.mock_interview_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mock_interviews
            WHERE mock_interviews.id = mock_interview_answers.mock_interview_id
            AND mock_interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own mock interview answers" ON public.mock_interview_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.mock_interviews
            WHERE mock_interviews.id = mock_interview_answers.mock_interview_id
            AND mock_interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own mock interview answers" ON public.mock_interview_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.mock_interviews
            WHERE mock_interviews.id = mock_interview_answers.mock_interview_id
            AND mock_interviews.user_id = auth.uid()
        )
    );

-- Create updated_at trigger for mock_interviews
CREATE TRIGGER update_mock_interviews_updated_at
    BEFORE UPDATE ON public.mock_interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for mock_interview_answers
CREATE TRIGGER update_mock_interview_answers_updated_at
    BEFORE UPDATE ON public.mock_interview_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

