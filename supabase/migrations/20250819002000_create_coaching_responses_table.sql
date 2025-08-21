-- Create coaching_responses table for tracking student submissions in interactive coaching
CREATE TABLE coaching_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  student_response TEXT NOT NULL,
  submitted_code TEXT NOT NULL,
  validation_result JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_coaching_responses_session_id ON coaching_responses(session_id);
CREATE INDEX idx_coaching_responses_step_number ON coaching_responses(session_id, step_number);
CREATE INDEX idx_coaching_responses_created_at ON coaching_responses(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE coaching_responses ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users can only access their own coaching responses
CREATE POLICY "Users can view their own coaching responses" ON coaching_responses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM coaching_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own coaching responses" ON coaching_responses
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM coaching_sessions WHERE user_id = auth.uid()
    )
  );

-- Update coaching_sessions table to support interactive flow
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS current_step_number INTEGER DEFAULT 1;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS current_question TEXT;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS awaiting_submission BOOLEAN DEFAULT FALSE;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS session_state TEXT DEFAULT 'active';

-- Add index for session state queries
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_state ON coaching_sessions(session_state, user_id);

-- Add comments for documentation
COMMENT ON TABLE coaching_responses IS 'Tracks student submissions and AI validations in interactive coaching sessions';
COMMENT ON COLUMN coaching_responses.validation_result IS 'JSONB containing AI validation feedback, code analysis, and next step information';
COMMENT ON COLUMN coaching_sessions.current_step_number IS 'Current step number in interactive coaching flow';
COMMENT ON COLUMN coaching_sessions.awaiting_submission IS 'Whether the session is waiting for student code submission';