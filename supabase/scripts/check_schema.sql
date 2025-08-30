-- Check what tables exist
\dt

-- Check the structure of problems table
\d problems

-- Check the structure of categories table if it exists
\d categories

-- List all columns in problems table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'problems' 
ORDER BY ordinal_position;