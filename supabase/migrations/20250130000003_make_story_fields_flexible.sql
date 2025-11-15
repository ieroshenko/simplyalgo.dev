-- Make story fields more flexible for experience bank approach
-- Migration: Make STAR fields optional and add description field

-- Add a description field for free-form experience description
ALTER TABLE public.user_stories 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Make STAR fields nullable (they're optional now - users can just describe their experience)
ALTER TABLE public.user_stories 
ALTER COLUMN situation DROP NOT NULL,
ALTER COLUMN task DROP NOT NULL,
ALTER COLUMN action DROP NOT NULL,
ALTER COLUMN result DROP NOT NULL;

-- Update existing rows to have description if they don't have one
-- Combine existing STAR fields into description for existing stories
UPDATE public.user_stories
SET description = COALESCE(
  description,
  situation || E'\n\n' || 
  CASE WHEN task IS NOT NULL AND task != '' THEN 'Task: ' || task || E'\n\n' ELSE '' END ||
  CASE WHEN action IS NOT NULL AND action != '' THEN 'Action: ' || action || E'\n\n' ELSE '' END ||
  CASE WHEN result IS NOT NULL AND result != '' THEN 'Result: ' || result ELSE '' END
)
WHERE description IS NULL;

-- Add comment
COMMENT ON COLUMN public.user_stories.description IS 'Free-form description of the experience, project, or achievement';

