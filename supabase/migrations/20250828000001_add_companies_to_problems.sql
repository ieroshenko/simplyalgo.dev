-- Add companies column to problems table
-- This allows storing multiple companies that ask each problem

-- Add the companies column as JSONB array with default empty array
ALTER TABLE public.problems 
ADD COLUMN companies jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.problems.companies IS 'Array of company names that have asked this problem, e.g., ["Google", "Amazon", "Microsoft"]';

-- Create an index on companies column for efficient querying
CREATE INDEX idx_problems_companies ON public.problems USING gin(companies);

-- Example: Update a problem to include companies
-- UPDATE public.problems 
-- SET companies = '["Google", "Amazon", "Meta"]'::jsonb 
-- WHERE id = 'two-sum';

-- Example queries enabled by this column:

-- Find problems asked by a specific company
-- SELECT id, title FROM problems WHERE companies ? 'Google';

-- Find problems asked by multiple specific companies
-- SELECT id, title FROM problems WHERE companies ?& ARRAY['Google', 'Amazon'];

-- Find problems asked by any of several companies
-- SELECT id, title FROM problems WHERE companies ?| ARRAY['Google', 'Meta', 'Netflix'];

-- Count problems per company
-- SELECT company, COUNT(*) as problem_count
-- FROM problems, jsonb_array_elements_text(companies) AS company
-- GROUP BY company
-- ORDER BY problem_count DESC;