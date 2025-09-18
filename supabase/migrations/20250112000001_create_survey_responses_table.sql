-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_data JSONB NOT NULL DEFAULT '{}',
  completed_steps INTEGER[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one survey response per user
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_completed_at ON survey_responses(completed_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_survey_responses_updated_at 
  BEFORE UPDATE ON survey_responses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own survey responses" ON survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey responses" ON survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey responses" ON survey_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON survey_responses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
