# Database Schema Documentation

This document outlines the complete database schema for the SimplyAlgo DSA Platform.

## Core Tables

### Problems (`problems`)
The main table storing DSA problems.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | text | NO | Unique problem identifier (slug format) |
| `title` | text | NO | Human-readable problem title |
| `difficulty` | difficulty_level | NO | ENUM: 'Easy', 'Medium', 'Hard' |
| `category_id` | uuid | NO | Foreign key to categories table |
| `description` | text | NO | Problem statement and requirements |
| `function_signature` | text | NO | Starting code template |
| `examples` | jsonb | NO | Example inputs/outputs (default: []) |
| `constraints` | jsonb | NO | Problem constraints (default: []) |
| `hints` | jsonb | NO | Problem hints (default: []) |
| `acceptance_rate` | numeric(5,2) | YES | Success rate percentage |
| `likes` | integer | YES | User likes count |
| `dislikes` | integer | YES | User dislikes count |
| `recommended_time_complexity` | text | YES | Expected time complexity (e.g., "O(n)") |
| `recommended_space_complexity` | text | YES | Expected space complexity |
| `companies` | jsonb | NO | Array of companies that ask this problem |
| `created_at` | timestamptz | NO | Creation timestamp |
| `updated_at` | timestamptz | NO | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** 
- `category_id` → `categories.id`

**Indexes:**
- `idx_problems_companies` - GIN index on `companies` for efficient company filtering

**Companies Column Format:**
- Stored as JSONB array: `["Google", "Amazon", "Microsoft"]`
- Default: empty array `[]`
- Enables queries like: `WHERE companies ? 'Google'` (contains company)
- Supports advanced operations: `?&` (contains all), `?|` (contains any)

---

### Categories (`categories`)
Problem categories and their metadata.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Unique category identifier |
| `name` | text | NO | Category name (e.g., "Array", "Dynamic Programming") |
| `color` | text | NO | Hex color code for UI display |
| `description` | text | YES | Category description |
| `sort_order` | integer | NO | Display order (default: 0) |
| `created_at` | timestamptz | NO | Creation timestamp |
| `updated_at` | timestamptz | NO | Last update timestamp |

**Primary Key:** `id`

---

### Test Cases (`test_cases`)
Test cases for validating problem solutions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Unique test case identifier |
| `problem_id` | text | NO | Foreign key to problems table |
| `input` | text | NO | Legacy text input format |
| `expected_output` | text | NO | Legacy expected output format |
| `input_json` | jsonb | YES | Structured JSON input parameters |
| `expected_json` | jsonb | YES | Structured JSON expected output |
| `is_example` | boolean | NO | Whether shown as example (default: false) |
| `explanation` | text | YES | Explanation for the test case |
| `created_at` | timestamptz | NO | Creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** 
- `problem_id` → `problems.id`

**Notes:**
- Legacy `input`/`expected_output` columns maintained for backward compatibility
- New `input_json`/`expected_json` columns provide structured data
- Example: `{"list1": [1,2,4], "list2": [1,3,4]}`

---

### Problem Solutions (`problem_solutions`)
Curated solutions with explanations.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Unique solution identifier |
| `problem_id` | text | NO | Foreign key to problems table |
| `title` | text | NO | Solution title/approach name |
| `code` | text | NO | Complete solution code |
| `time_complexity` | text | YES | Time complexity analysis |
| `space_complexity` | text | YES | Space complexity analysis |
| `explanation` | text | YES | Detailed explanation |
| `approach_type` | text | YES | Solution approach category |
| `language` | text | NO | Programming language (default: 'python') |
| `difficulty_rating` | integer | YES | Difficulty rating (1-5) |
| `is_preferred` | boolean | NO | Primary solution flag (default: false) |
| `created_at` | timestamptz | YES | Creation timestamp |
| `updated_at` | timestamptz | YES | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** 
- `problem_id` → `problems.id`

**Constraints:**
- `approach_type` ∈ ['brute_force', 'optimal', 'alternative', 'recursive', 'iterative', 'dp', 'greedy', 'two_pointer', 'sliding_window', 'binary_search', 'dfs', 'bfs', 'backtracking']
- `language` ∈ ['python', 'javascript', 'java', 'cpp', 'go']
- `difficulty_rating` ∈ [1, 2, 3, 4, 5]

## User-Related Tables

### User Profiles (`user_profiles`)
Extended user information beyond Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Foreign key to auth.users |
| `name` | text | Display name |
| `email` | text | User email |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

---

### User Statistics (`user_statistics`)
Problem-solving statistics per user.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Foreign key to auth.users |
| `problems_solved` | integer | Total problems completed |
| `easy_solved` | integer | Easy problems solved |
| `medium_solved` | integer | Medium problems solved |
| `hard_solved` | integer | Hard problems solved |
| `streak_count` | integer | Current solving streak |
| `max_streak` | integer | Longest streak achieved |
| `last_solved_at` | timestamptz | Last problem completion |

---

### User Problem Attempts (`user_problem_attempts`)
Individual user attempts at problems.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique attempt identifier |
| `user_id` | uuid | Foreign key to auth.users |
| `problem_id` | text | Foreign key to problems |
| `code` | text | Submitted solution code |
| `status` | attempt_status | ENUM: 'pending', 'passed', 'failed', 'error' |
| `test_results` | jsonb | Test execution results |
| `created_at` | timestamptz | Submission timestamp |

---

### User Starred Problems (`user_starred_problems`)
User's favorited problems.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Foreign key to auth.users |
| `problem_id` | text | Foreign key to problems |
| `created_at` | timestamptz | Star timestamp |

**Composite Primary Key:** (`user_id`, `problem_id`)

---

### Notes (`notes`)
User notes per problem.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique note identifier |
| `user_id` | uuid | Foreign key to auth.users |
| `problem_id` | text | Foreign key to problems |
| `content` | text | Note content (max 5000 chars) |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Unique Constraint:** (`user_id`, `problem_id`)

## AI and Coaching Tables

### AI Chat Sessions (`ai_chat_sessions`)
Chat sessions with AI assistant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique session identifier |
| `user_id` | uuid | Foreign key to auth.users |
| `problem_id` | text | Associated problem |
| `created_at` | timestamptz | Session start time |
| `updated_at` | timestamptz | Last message time |

---

### AI Chat Messages (`ai_chat_messages`)
Individual messages within chat sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique message identifier |
| `session_id` | uuid | Foreign key to ai_chat_sessions |
| `role` | text | Message sender ('user' or 'assistant') |
| `content` | text | Message content |
| `code_snippets` | jsonb | Embedded code snippets |
| `created_at` | timestamptz | Message timestamp |

---

### Coaching Sessions (`coaching_sessions`)
AI coaching session management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique session identifier |
| `user_id` | uuid | Foreign key to auth.users |
| `problem_id` | text | Foreign key to problems |
| `session_type` | text | Coaching mode type |
| `status` | text | Session status |
| `current_step` | integer | Current coaching step |
| `total_steps` | integer | Total planned steps |
| `created_at` | timestamptz | Session start |
| `completed_at` | timestamptz | Session completion |

## ENUMS

### difficulty_level
- `Easy`
- `Medium`  
- `Hard`

### attempt_status
- `pending` - Submission received
- `passed` - All tests passed
- `failed` - Some tests failed
- `error` - Execution error

### problem_status
- `solved` - User completed the problem
- `attempted` - User tried but hasn't solved
- `not-started` - User hasn't attempted

## Flashcard System Tables

### Flashcard Decks (`flashcard_decks`)
Spaced repetition learning cards for solved problems.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Unique deck identifier |
| `user_id` | uuid | NO | Foreign key to auth.users |
| `problem_id` | text | NO | Foreign key to problems |
| `solution_id` | uuid | YES | Foreign key to problem_solutions (null for custom) |
| `solution_title` | text | YES | Title for custom solutions |
| `solution_code` | text | YES | Code for custom solutions |
| `created_at` | timestamptz | NO | Creation timestamp |
| `last_reviewed_at` | timestamptz | YES | Last review timestamp |
| `next_review_date` | date | NO | Next scheduled review date |
| `mastery_level` | integer | NO | Mastery level (0-3: new, learning, good, mastered) |
| `review_count` | integer | NO | Number of times reviewed (default: 0) |
| `ease_factor` | numeric(3,2) | NO | SM-2 algorithm ease factor (default: 2.50) |
| `interval_days` | integer | NO | Current review interval in days |

**Primary Key:** `id`  
**Foreign Keys:**
- `user_id` → `auth.users.id`
- `problem_id` → `problems.id`
- `solution_id` → `problem_solutions.id` (nullable)

**Constraints:**
- `mastery_level` ∈ [0, 1, 2, 3]
- `ease_factor` ≥ 1.30
- `interval_days` ≥ 1
- Either `solution_id` OR both `solution_title` and `solution_code` must be provided

**Unique Index:** Composite on (`user_id`, `problem_id`, `COALESCE(solution_id::TEXT, solution_title)`)

**Notes:**
- Supports both curated solutions (via `solution_id`) and custom solutions (via `solution_title`/`solution_code`)
- Uses SM-2 spaced repetition algorithm for scheduling reviews
- Custom solutions typically come from user submissions

---

### Flashcard Reviews (`flashcard_reviews`)
Individual review sessions with AI interaction tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Unique review identifier |
| `deck_id` | uuid | NO | Foreign key to flashcard_decks |
| `reviewed_at` | timestamptz | NO | Review session timestamp |
| `ai_questions` | jsonb | NO | Array of AI-generated questions |
| `user_answers` | jsonb | NO | Array of user responses |
| `ai_evaluation` | jsonb | YES | AI assessment of user understanding |
| `user_difficulty_rating` | integer | NO | User's difficulty rating (1-4) |
| `time_spent_seconds` | integer | YES | Time spent in review session |
| `notes` | text | YES | Optional user notes from session |

**Primary Key:** `id`  
**Foreign Keys:**
- `deck_id` → `flashcard_decks.id`

**Constraints:**
- `user_difficulty_rating` ∈ [1, 2, 3, 4] (Again, Hard, Good, Easy)

**Notes:**
- `ai_questions`: Structured array of conversation questions
- `ai_evaluation`: AI's assessment of user's conceptual understanding
- Used to track learning progress and adjust spaced repetition scheduling

---

## Key Relationships

1. **Problems → Categories**: Many-to-One via `category_id`
2. **Problems → Test Cases**: One-to-Many via `problem_id`
3. **Problems → Solutions**: One-to-Many via `problem_id`
4. **Users → Problem Attempts**: One-to-Many via `user_id`
5. **Users → Notes**: One-to-Many via `user_id` (unique per problem)
6. **Users → Starred Problems**: Many-to-Many via junction table
7. **Users → Chat Sessions**: One-to-Many via `user_id`
8. **Chat Sessions → Messages**: One-to-Many via `session_id`
9. **Users → Flashcard Decks**: One-to-Many via `user_id`
10. **Flashcard Decks → Reviews**: One-to-Many via `deck_id`
11. **Problems → Flashcard Decks**: One-to-Many via `problem_id`
12. **Problem Solutions → Flashcard Decks**: One-to-Many via `solution_id` (optional)

## Database Functions

### Flashcard System Functions

#### `get_cards_due_for_review(p_user_id UUID)`
Returns flashcards due for review with problem and solution details.

**Returns:**
```sql
TABLE (
    deck_id UUID,
    problem_id TEXT,
    problem_title TEXT,
    solution_title TEXT,
    solution_code TEXT,
    next_review_date DATE,
    mastery_level INTEGER,
    review_count INTEGER,
    days_overdue INTEGER,
    is_custom_solution BOOLEAN
)
```

**Usage:**
```sql
SELECT * FROM get_cards_due_for_review('user-uuid-here');
```

#### `update_flashcard_schedule(p_deck_id UUID, p_difficulty_rating INTEGER)`
Updates flashcard scheduling using SM-2 algorithm after review.

**Parameters:**
- `p_deck_id`: Flashcard deck ID
- `p_difficulty_rating`: User's difficulty rating (1=Again, 2=Hard, 3=Good, 4=Easy)

**Algorithm Details:**
- **Again (1)**: Reset interval to 1 day, decrease ease factor by 0.20, reduce mastery level
- **Hard (2)**: Multiply interval by ease * 0.8, decrease ease factor by 0.15
- **Good (3)**: Multiply interval by ease factor, increase mastery level
- **Easy (4)**: Multiply interval by ease * 1.3, increase ease factor by 0.10, increase mastery level

## Data Migration Notes

- Test cases support both legacy text format and new JSON format
- Use `backfill_json_test_cases()` function to migrate legacy data
- Problem solutions support multiple languages and approaches
- User statistics are automatically updated via triggers
- All tables use RLS (Row Level Security) for data access control
- Flashcard system supports migration from curated solutions to custom solutions

## Query Patterns

### Get Problem with All Related Data
```sql
SELECT p.*, c.name as category_name,
       COUNT(tc.id) as test_case_count,
       COUNT(ps.id) as solution_count
FROM problems p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN test_cases tc ON p.id = tc.problem_id
LEFT JOIN problem_solutions ps ON p.id = ps.problem_id
WHERE p.id = 'two-sum'
GROUP BY p.id, c.name;
```

### Get User Problem Progress
```sql
SELECT p.id, p.title, p.difficulty,
       CASE WHEN upa.status = 'passed' THEN 'solved'
            WHEN upa.id IS NOT NULL THEN 'attempted'
            ELSE 'not-started' END as status
FROM problems p
LEFT JOIN user_problem_attempts upa ON p.id = upa.problem_id 
    AND upa.user_id = $1 
    AND upa.status = 'passed'
ORDER BY p.title;
```

### Company-Based Queries
```sql
-- Find problems asked by Google
SELECT id, title, companies 
FROM problems 
WHERE companies ? 'Google';

-- Find problems asked by both Google AND Amazon
SELECT id, title, companies 
FROM problems 
WHERE companies ?& ARRAY['Google', 'Amazon'];

-- Find problems asked by Google OR Meta OR Netflix
SELECT id, title, companies 
FROM problems 
WHERE companies ?| ARRAY['Google', 'Meta', 'Netflix'];

-- Count problems per company
SELECT company, COUNT(*) as problem_count
FROM problems, jsonb_array_elements_text(companies) AS company
GROUP BY company
ORDER BY problem_count DESC;

-- Find problems asked by at least 3 companies
SELECT id, title, jsonb_array_length(companies) as company_count
FROM problems 
WHERE jsonb_array_length(companies) >= 3
ORDER BY company_count DESC;
```

### Flashcard System Queries

```sql
-- Get flashcard stats for a user
SELECT 
    COUNT(*) as total_cards,
    COUNT(*) FILTER (WHERE next_review_date <= CURRENT_DATE) as due_today,
    COUNT(*) FILTER (WHERE mastery_level = 0) as new_cards,
    COUNT(*) FILTER (WHERE mastery_level = 1) as learning_cards,
    COUNT(*) FILTER (WHERE mastery_level = 3) as mastered_cards,
    AVG(ease_factor) as avg_ease_factor
FROM flashcard_decks 
WHERE user_id = $1;

-- Get flashcards due for review with problem details
SELECT 
    fd.id as deck_id,
    fd.problem_id,
    p.title as problem_title,
    COALESCE(ps.title, fd.solution_title) as solution_title,
    COALESCE(ps.code, fd.solution_code) as solution_code,
    fd.next_review_date,
    fd.mastery_level,
    (fd.solution_id IS NULL) as is_custom_solution
FROM flashcard_decks fd
JOIN problems p ON fd.problem_id = p.id
LEFT JOIN problem_solutions ps ON fd.solution_id = ps.id
WHERE fd.user_id = $1 
  AND fd.next_review_date <= CURRENT_DATE
ORDER BY fd.next_review_date ASC;

-- Check if problem already exists in flashcards
SELECT EXISTS(
    SELECT 1 FROM flashcard_decks 
    WHERE user_id = $1 AND problem_id = $2
) as exists_in_flashcards;

-- Get user's flashcard learning progress over time
SELECT 
    DATE(last_reviewed_at) as review_date,
    COUNT(*) as cards_reviewed,
    AVG(CASE 
        WHEN fr.user_difficulty_rating = 1 THEN 0
        WHEN fr.user_difficulty_rating = 2 THEN 33
        WHEN fr.user_difficulty_rating = 3 THEN 67
        WHEN fr.user_difficulty_rating = 4 THEN 100
    END) as avg_performance_score
FROM flashcard_decks fd
JOIN flashcard_reviews fr ON fd.id = fr.deck_id
WHERE fd.user_id = $1
  AND last_reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(last_reviewed_at)
ORDER BY review_date;
```