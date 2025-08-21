-- Add visualization_code column to problems table
ALTER TABLE problems 
ADD COLUMN visualization_code TEXT,
ADD COLUMN has_visualization BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN problems.visualization_code IS 'React component code for interactive algorithm visualization';
COMMENT ON COLUMN problems.has_visualization IS 'Whether this problem has a custom visualization available';

-- Create index for faster queries
CREATE INDEX idx_problems_has_visualization ON problems(has_visualization) WHERE has_visualization = true;