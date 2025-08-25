-- Fix completion_logic constraint to allow failed sessions
-- This addresses the constraint violation when marking stuck sessions as failed

-- Drop the existing constraint
ALTER TABLE coaching_sessions DROP CONSTRAINT completion_logic;

-- Add a new constraint that allows failed sessions to have is_active=false with completed_at=null
ALTER TABLE coaching_sessions ADD CONSTRAINT completion_logic 
CHECK (
  (is_active = true AND completed_at IS NULL) OR
  (is_active = false AND (completed_at IS NOT NULL OR session_state = 'failed'))
);

-- Clean up stuck coaching sessions that failed during initialization
UPDATE coaching_sessions 
SET is_active = false, 
    session_state = 'failed', 
    updated_at = NOW() 
WHERE current_question IS NULL 
  AND awaiting_submission = false 
  AND is_active = true;
