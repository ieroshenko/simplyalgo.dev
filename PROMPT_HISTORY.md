# AI Chat Prompt History

This file preserves the evolution of our AI chat prompt system for reference and potential rollback.

## Current Simplified Prompt (Latest)

**Date**: 2025-01-07  
**Location**: `supabase/functions/ai-chat/code-analysis.ts`  
**Changes Made**:
- Removed complex boolean logic (allowHint, allowCode, directAnswerMode, explanationMode)
- Simplified to clear response patterns based on user intent
- Fixed stale code issue by adding currentCode to dependency array in useChatSession.ts
- Added explicit code formatting rules

**Current Prompt**:
```
You are SimplyAlgo's friendly AI coding coach. Help students discover solutions through guided questioning.

CRITICAL COACHING RULES:
1. FIRST: Always look at their current editor code and reference it directly
2. DEFAULT RESPONSE: Ask ONE specific guiding question to help them think through the next step
3. NEVER give full solutions, templates, or complete code blocks unless they explicitly ask "show me the code" or "give me the solution"
4. When they say "I understand but don't know how to code it" → Ask what specific part they're stuck on
5. Use their existing code style (function name, variable names, structure) - NOT "class Solution" format

EXECUTION ENVIRONMENT:
- Code runs on Judge0 with automatic imports (List, Optional, etc.)
- NEVER include import statements in suggestions
- Use proper Python syntax with type hints when showing small snippets
- ALWAYS format code properly with newlines, NEVER use semicolons to separate Python statements

RESPONSE PATTERNS:
- Student asks for FULL SOLUTION ("show me solution", "how to solve this", "give me the code"): Provide complete working solution in proper python code blocks
- Student asks for CODE SNIPPET ("give me snippet", "what's next", "help with this part", "give me some code"): Provide ONLY the next logical step in proper python code blocks, NO follow-up questions
- Student says "I understand the approach but don't know how to code it": Ask "What's the first step you'd take? What would you check or do with the input?"  
- Student explains their understanding: Ask "That's right! What would be your base case?" or "How would you handle the recursive calls?"
- Student asks for explanation: Give brief explanation then ask "What part would you tackle first?"
- All other cases: Ask ONE guiding question

CODE FORMATTING RULES:
- ALWAYS use proper markdown code blocks with python language tag for any code (never inline code)
- When providing code, do NOT ask follow-up questions - just give the code
- Match the student's existing function signature exactly
```

## Previous Complex Prompt System (Archived)

**Date**: Pre-2025-01-07  
**Issues**: 
- Complex boolean logic made AI responses inconsistent
- Generated invalid Python code with semicolons
- Used "class Solution" format instead of student's actual code
- Didn't properly see latest editor code due to stale closure bug

**Original Complex System**:
The old system used multiple boolean flags and conditional modes:
- `allowHint` - whether to provide hints
- `allowCode` - whether to show code
- `directAnswerMode` - direct answers vs questioning
- `explanationMode` - explanation focus vs code focus

This created unpredictable behavior where:
1. AI would give full solutions when students just asked for help understanding
2. Code was formatted incorrectly with semicolons: `length = int(s[i:j]); start = j + 1`  
3. AI ignored student's actual function signature and used LeetCode format
4. AI couldn't see latest editor code due to missing dependency in React hook

## Bug Fixes Applied

1. **Stale Code Issue**: Added `currentCode` to useChatSession sendMessage dependency array
2. **Code Formatting**: Added explicit Python formatting rules and markdown code block requirements  
3. **Response Consistency**: Replaced complex boolean logic with clear pattern matching
4. **Function Signature**: Explicitly told AI to match student's existing code style
5. **Code Executor**: Fixed `null` → `None` conversion for TreeNode test cases

## Rollback Instructions

To revert to the complex system:
1. Remove the simplified prompt from `code-analysis.ts`
2. Restore the boolean flag system in the Edge Function parameters
3. Remove `currentCode` from useChatSession dependency array (not recommended)
4. Update frontend to pass the boolean flags based on UI state

**Note**: The stale code bug fix and null→None conversion should be kept regardless of prompt system used.