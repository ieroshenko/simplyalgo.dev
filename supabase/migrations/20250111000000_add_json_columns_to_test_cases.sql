-- Add JSONB columns to test_cases table for structured data
-- This migration adds JSON-native columns while keeping legacy text columns for backward compatibility

-- Add the new JSONB columns
ALTER TABLE public.test_cases 
ADD COLUMN input_json jsonb,
ADD COLUMN expected_json jsonb;

-- Add indexes for better performance on JSON queries
CREATE INDEX idx_test_cases_input_json ON public.test_cases USING gin (input_json);
CREATE INDEX idx_test_cases_expected_json ON public.test_cases USING gin (expected_json);

-- Add comments to document the migration strategy
COMMENT ON COLUMN public.test_cases.input_json IS 'Structured JSON input parameters, e.g., {"list1": [1,2,4], "list2": [1,3,4]}';
COMMENT ON COLUMN public.test_cases.expected_json IS 'Structured JSON expected output, e.g., [1,1,2,3,4,4] or primitive values';
COMMENT ON COLUMN public.test_cases.input IS 'Legacy text input format - kept for backward compatibility';
COMMENT ON COLUMN public.test_cases.expected_output IS 'Legacy text expected output - kept for backward compatibility';

-- Create a function to help migrate existing text data to JSON format
CREATE OR REPLACE FUNCTION migrate_test_case_to_json(
  problem_signature text,
  input_text text,
  expected_text text
) RETURNS TABLE(input_json jsonb, expected_json jsonb) AS $$
DECLARE
  param_names text[];
  param_name text;
  param_value text;
  result_input jsonb := '{}';
  result_expected jsonb;
BEGIN
  -- Extract parameter names from function signature
  -- Example: "def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode])" 
  -- Should extract ["list1", "list2"]
  
  -- Simple regex to extract parameter names (excluding 'self')
  SELECT array_agg(trim(split_part(param, ':', 1))) 
  INTO param_names
  FROM (
    SELECT unnest(string_to_array(
      regexp_replace(
        regexp_replace(problem_signature, '.*\(([^)]+)\).*', '\1'),
        '\s*(self\s*,?\s*)', '', 'g'
      ), 
      ','
    )) as param
  ) t
  WHERE trim(param) != '';
  
  -- Parse input_text in format "list1 = [1,2,4], list2 = [1,3,4]"
  IF input_text ~ '=' THEN
    -- Split by comma, but handle arrays properly
    DECLARE
      parts text[];
      part text;
      eq_pos int;
      param_name_clean text;
      param_value_clean text;
    BEGIN
      -- Simple split for now - can be enhanced with proper bracket counting
      parts := string_to_array(input_text, ',');
      
      -- Try to reconstruct split parameters that got broken by commas in arrays
      DECLARE
        reconstructed_parts text[] := '{}';
        current_part text := '';
        bracket_count int := 0;
        i int;
      BEGIN
        FOR i IN 1..array_length(parts, 1) LOOP
          current_part := current_part || CASE WHEN current_part = '' THEN '' ELSE ',' END || parts[i];
          
          -- Count brackets to determine if we're inside an array
          bracket_count := bracket_count + 
            (length(parts[i]) - length(replace(parts[i], '[', ''))) -
            (length(parts[i]) - length(replace(parts[i], ']', '')));
          
          -- If brackets are balanced and we have an equals sign, this is a complete parameter
          IF bracket_count = 0 AND current_part ~ '=' THEN
            reconstructed_parts := reconstructed_parts || current_part;
            current_part := '';
          END IF;
        END LOOP;
        
        -- Add any remaining part
        IF current_part != '' THEN
          reconstructed_parts := reconstructed_parts || current_part;
        END IF;
        
        parts := reconstructed_parts;
      END;
      
      -- Parse each parameter
      FOREACH part IN ARRAY parts LOOP
        eq_pos := position(' = ' in part);
        IF eq_pos > 0 THEN
          param_name_clean := trim(substring(part, 1, eq_pos - 1));
          param_value_clean := trim(substring(part, eq_pos + 3));
          
          -- Try to parse as JSON, fallback to string
          BEGIN
            result_input := result_input || jsonb_build_object(param_name_clean, param_value_clean::jsonb);
          EXCEPTION WHEN others THEN
            -- Remove quotes if it's a simple string
            param_value_clean := regexp_replace(param_value_clean, '^"(.*)"$', '\1');
            result_input := result_input || jsonb_build_object(param_name_clean, param_value_clean);
          END;
        END IF;
      END LOOP;
    END;
  ELSE
    -- Format 2: positional values, map to parameter names
    DECLARE
      lines text[];
      i int;
    BEGIN
      lines := string_to_array(input_text, E'\n');
      FOR i IN 1..LEAST(array_length(param_names, 1), array_length(lines, 1)) LOOP
        BEGIN
          result_input := result_input || jsonb_build_object(param_names[i], lines[i]::jsonb);
        EXCEPTION WHEN others THEN
          result_input := result_input || jsonb_build_object(param_names[i], lines[i]);
        END;
      END LOOP;
    END;
  END IF;
  
  -- Parse expected output
  BEGIN
    result_expected := expected_text::jsonb;
  EXCEPTION WHEN others THEN
    result_expected := to_jsonb(expected_text);
  END;
  
  RETURN QUERY SELECT result_input, result_expected;
END;
$$ LANGUAGE plpgsql;

-- Create a procedure to backfill existing data
CREATE OR REPLACE FUNCTION backfill_json_test_cases() RETURNS void AS $$
DECLARE
  rec record;
  migrated record;
BEGIN
  FOR rec IN 
    SELECT tc.id, tc.input, tc.expected_output, p.function_signature
    FROM test_cases tc
    JOIN problems p ON tc.problem_id = p.id
    WHERE tc.input_json IS NULL AND tc.expected_json IS NULL
  LOOP
    -- Migrate this test case
    SELECT * INTO migrated 
    FROM migrate_test_case_to_json(rec.function_signature, rec.input, rec.expected_output);
    
    -- Update the row with JSON data
    UPDATE test_cases 
    SET input_json = migrated.input_json,
        expected_json = migrated.expected_json
    WHERE id = rec.id;
    
    RAISE NOTICE 'Migrated test case %: input=% expected=%', 
      rec.id, migrated.input_json, migrated.expected_json;
  END LOOP;
END;
$$ LANGUAGE plpgsql;