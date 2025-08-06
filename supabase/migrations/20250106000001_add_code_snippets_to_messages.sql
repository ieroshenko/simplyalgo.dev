-- Add code_snippets column to ai_chat_messages table
-- This will store the validated code snippets returned by the AI

ALTER TABLE ai_chat_messages 
ADD COLUMN code_snippets JSONB DEFAULT NULL;

-- Add an index on the code_snippets column for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_code_snippets 
ON ai_chat_messages USING GIN (code_snippets);

-- Add a comment to document the schema
COMMENT ON COLUMN ai_chat_messages.code_snippets IS 
'JSON array of validated code snippets that can be inserted into the code editor. Each snippet contains: id, code, language, isValidated, insertionType, and insertionHint metadata.';

-- Example of code_snippets structure:
-- [
--   {
--     "id": "snippet-123",
--     "code": "from collections import Counter",
--     "language": "python",
--     "isValidated": true,
--     "insertionType": "smart",
--     "insertionHint": {
--       "type": "import",
--       "scope": "global", 
--       "description": "Import Counter for character frequency counting"
--     }
--   }
-- ]