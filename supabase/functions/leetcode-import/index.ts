import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// LeetCode GraphQL query for problem data
const LEETCODE_QUERY = `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    content
    difficulty
    topicTags {
      name
      slug
    }
    codeSnippets {
      lang
      langSlug
      code
    }
    hints
    companyTags {
      name
      slug
    }
    stats
    sampleTestCase
  }
}
`;

// Category mapping from LeetCode tags to SimplyAlgo category names
const CATEGORY_MAPPING: Record<string, string> = {
  "array": "Arrays & Hashing",
  "hash-table": "Arrays & Hashing",
  "two-pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  "stack": "Stack",
  "binary-search": "Binary Search",
  "linked-list": "Linked List",
  "tree": "Trees",
  "binary-tree": "Trees",
  "binary-search-tree": "Trees",
  "trie": "Tries",
  "heap": "Heap / Priority Queue",
  "priority-queue": "Heap / Priority Queue",
  "backtracking": "Backtracking",
  "graph": "Graphs",
  "depth-first-search": "Graphs",
  "breadth-first-search": "Graphs",
  "dynamic-programming": "1-D Dynamic Programming",
  "greedy": "Greedy",
  "bit-manipulation": "Bit Manipulation",
  "math": "Math & Geometry",
  "geometry": "Math & Geometry",
  "intervals": "Intervals",
};

interface LeetCodeProblem {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: string;
  topicTags: Array<{ name: string; slug: string }>;
  codeSnippets: Array<{ lang: string; langSlug: string; code: string }>;
  hints: string[];
  companyTags: Array<{ name: string; slug: string }>;
  stats: string;
  sampleTestCase: string;
}

interface GeneratedTestCase {
  input: string;
  expected_output: string;
  input_json: unknown;
  expected_json: unknown;
  explanation: string;
}

interface GeneratedSolution {
  title: string;
  code: string;
  time_complexity: string;
  space_complexity: string;
  explanation: string;
  approach_type: "brute_force" | "optimal" | "alternative";
}

/**
 * Extract slug from LeetCode URL
 */
function extractSlug(url: string): string | null {
  // Handle various LeetCode URL formats
  const patterns = [
    /leetcode\.com\/problems\/([^/]+)/,
    /leetcode\.com\/problems\/([^/]+)\/description/,
    /leetcode\.com\/problems\/([^/]+)\/solutions/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1].replace(/\/$/, "");
    }
  }
  return null;
}

/**
 * Fetch problem data from LeetCode GraphQL API
 */
async function fetchLeetCodeProblem(slug: string): Promise<LeetCodeProblem> {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { titleSlug: slug },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`LeetCode GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  if (!data.data?.question) {
    throw new Error(`Problem not found: ${slug}`);
  }

  return data.data.question;
}

/**
 * Convert HTML content to Markdown
 */
function htmlToMarkdown(html: string): string {
  if (!html) return "";

  let md = html
    // Convert code blocks
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    // Convert headers
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n## $1\n")
    // Convert lists
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    // Convert bold/strong
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    // Convert italic/emphasis
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    // Convert subscript/superscript
    .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
    .replace(/<sub>(.*?)<\/sub>/gi, "_$1")
    // Convert paragraphs and line breaks
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return md;
}

/**
 * Extract constraints from HTML content
 */
function extractConstraints(content: string): string[] {
  const constraints: string[] = [];

  // Look for constraints section
  const constraintsMatch = content.match(/<strong>Constraints:<\/strong>([\s\S]*?)(?:<strong>|$)/i);
  if (constraintsMatch) {
    const constraintsHtml = constraintsMatch[1];
    const listItems = constraintsHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];

    for (const item of listItems) {
      const text = item
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        constraints.push(text);
      }
    }
  }

  return constraints;
}

/**
 * Extract examples from HTML content
 */
function extractExamples(content: string): Array<{ input: string; output: string; explanation?: string }> {
  const examples: Array<{ input: string; output: string; explanation?: string }> = [];

  // Match example blocks
  const examplePattern = /<strong[^>]*>Example\s*\d*:?<\/strong>([\s\S]*?)(?=<strong[^>]*>Example|<strong>Constraints|$)/gi;
  let match;

  while ((match = examplePattern.exec(content)) !== null) {
    const exampleContent = match[1];

    // Extract input
    const inputMatch = exampleContent.match(/<strong>Input:<\/strong>\s*([\s\S]*?)(?=<strong>Output|$)/i);
    // Extract output
    const outputMatch = exampleContent.match(/<strong>Output:<\/strong>\s*([\s\S]*?)(?=<strong>Explanation|<strong>Example|<strong>Constraints|$)/i);
    // Extract explanation (optional)
    const explanationMatch = exampleContent.match(/<strong>Explanation:<\/strong>\s*([\s\S]*?)(?=<strong>|$)/i);

    if (inputMatch && outputMatch) {
      const input = inputMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const output = outputMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const example: { input: string; output: string; explanation?: string } = { input, output };

      if (explanationMatch) {
        example.explanation = explanationMatch[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      examples.push(example);
    }
  }

  return examples;
}

/**
 * Extract Python function signature from code snippets
 */
function extractPythonSignature(snippets: Array<{ lang: string; langSlug: string; code: string }>): string {
  const pythonSnippet = snippets.find(s => s.langSlug === "python3" || s.langSlug === "python");
  return pythonSnippet?.code || "";
}

/**
 * Map LeetCode tags to SimplyAlgo category
 */
function mapCategory(tags: Array<{ name: string; slug: string }>): string | null {
  for (const tag of tags) {
    const mapped = CATEGORY_MAPPING[tag.slug];
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

// OpenRouter client instance (initialized on first use)
let openrouterClient: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openrouterClient) {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }
    const siteUrl = Deno.env.get("OPENROUTER_SITE_URL") || "https://simplyalgo.dev";
    const appName = Deno.env.get("OPENROUTER_APP_NAME") || "SimplyAlgo";

    openrouterClient = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": siteUrl,
        "X-Title": appName,
      },
    });
  }
  return openrouterClient;
}

/**
 * Call OpenRouter API with Gemini to generate content
 * Uses OpenAI SDK with OpenRouter baseURL (same pattern as ai-chat)
 */
async function callOpenRouter(prompt: string, maxTokens: number = 4000): Promise<string> {
  const client = getOpenRouterClient();
  // Use a known working model - hardcoded to avoid invalid env var
  const model = "google/gemini-2.0-flash-001";

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  let content = response.choices[0]?.message?.content || "";

  // Clean markdown code blocks if present
  if (content.startsWith("```json")) {
    content = content.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
  } else if (content.startsWith("```")) {
    content = content.replace(/```\n?/g, "");
  }

  return content.trim();
}

/**
 * Generate test cases using AI
 */
async function generateTestCases(
  title: string,
  description: string,
  functionSignature: string,
  constraints: string[],
  examples: Array<{ input: string; output: string; explanation?: string }>
): Promise<GeneratedTestCase[]> {
  const prompt = `You are an expert algorithm engineer. Given this LeetCode problem, generate 3 additional test cases.

PROBLEM: ${title}

DESCRIPTION:
${description}

FUNCTION SIGNATURE:
\`\`\`python
${functionSignature}
\`\`\`

CONSTRAINTS:
${constraints.map(c => `- ${c}`).join("\n")}

EXISTING EXAMPLES:
${examples.map((e, i) => `Example ${i + 1}: Input: ${e.input}, Output: ${e.output}`).join("\n")}

Generate 3 additional test cases that cover edge cases such as:
1. Edge case (empty input, single element, boundary values)
2. Large/stress test case (near constraint limits)
3. Tricky case (corner cases that might trip up solutions)

Return ONLY valid JSON in this exact format:
{
  "test_cases": [
    {
      "input": "string representation of input (e.g., 'nums = [1,2,3], target = 6')",
      "expected_output": "string representation (e.g., '[0, 2]')",
      "input_json": <parsed input as JSON - arrays, objects, numbers etc>,
      "expected_json": <parsed output as JSON>,
      "explanation": "Why this test case is important"
    }
  ]
}

Important:
- input_json should be a JSON object with named parameters matching the function signature
- For example, if function is "def twoSum(nums, target)", input_json should be {"nums": [1,2,3], "target": 6}
- expected_json should be the raw expected value (array, number, string, etc)`;

  try {
    const response = await callOpenRouter(prompt);
    const parsed = JSON.parse(response);
    return parsed.test_cases || [];
  } catch (error) {
    console.error("Failed to generate test cases:", error);
    return [];
  }
}

/**
 * Generate solutions using AI
 */
async function generateSolutions(
  title: string,
  description: string,
  functionSignature: string,
  constraints: string[]
): Promise<GeneratedSolution[]> {
  const prompt = `You are an expert algorithm engineer. Given this LeetCode problem, generate 3 Python solutions.

PROBLEM: ${title}

DESCRIPTION:
${description}

FUNCTION SIGNATURE:
\`\`\`python
${functionSignature}
\`\`\`

CONSTRAINTS:
${constraints.map(c => `- ${c}`).join("\n")}

Generate 3 different solutions:
1. Brute Force - Simple, easy to understand but not optimal
2. Optimal Solution - Best time/space complexity
3. Alternative Approach - Different technique (if applicable, otherwise another valid approach)

Return ONLY valid JSON in this exact format:
{
  "solutions": [
    {
      "title": "Brute Force",
      "approach_type": "brute_force",
      "code": "def solution(...):\\n    # Complete Python code here",
      "time_complexity": "O(...)",
      "space_complexity": "O(...)",
      "explanation": "Markdown explanation of the approach, why it works, and trade-offs"
    },
    {
      "title": "Optimal Solution",
      "approach_type": "optimal",
      ...
    },
    {
      "title": "Alternative Approach",
      "approach_type": "alternative",
      ...
    }
  ]
}

Requirements:
- Code must be complete and runnable
- Use the exact function signature from the problem
- Include proper indentation (use \\n for newlines, 4 spaces for indentation)
- Explanations should be clear and mention key insights`;

  try {
    const response = await callOpenRouter(prompt, 6000);
    const parsed = JSON.parse(response);
    return parsed.solutions || [];
  } catch (error) {
    console.error("Failed to generate solutions:", error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin by email
    const ADMIN_EMAILS = [
      "tazigrigolia@gmail.com",
      "ivaneroshenko@gmail.com"
    ];

    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract slug from URL
    const slug = extractSlug(url);
    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Invalid LeetCode URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if problem already exists
    const { data: existingProblem } = await supabaseClient
      .from("problems")
      .select("id, title")
      .eq("id", slug)
      .single();

    if (existingProblem) {
      return new Response(
        JSON.stringify({
          error: "Problem already exists",
          existingProblem: { id: existingProblem.id, title: existingProblem.title }
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[leetcode-import] Fetching problem: ${slug}`);

    // Fetch from LeetCode
    const leetcodeProblem = await fetchLeetCodeProblem(slug);

    // Transform problem data
    const description = htmlToMarkdown(leetcodeProblem.content);
    const constraints = extractConstraints(leetcodeProblem.content);
    const examples = extractExamples(leetcodeProblem.content);
    const functionSignature = extractPythonSignature(leetcodeProblem.codeSnippets);
    const categoryName = mapCategory(leetcodeProblem.topicTags);
    const companies = leetcodeProblem.companyTags?.map(c => c.name) || [];

    // Look up category ID by name
    let categoryId: string | null = null;
    if (categoryName) {
      const { data: category } = await supabaseClient
        .from("categories")
        .select("id, name")
        .ilike("name", categoryName)
        .single();
      categoryId = category?.id || null;
    }

    // Fetch all categories for the response (so UI can show dropdown if mapping failed)
    const { data: allCategories } = await supabaseClient
      .from("categories")
      .select("id, name")
      .order("name");

    const warnings: string[] = [];

    // Generate AI content
    console.log(`[leetcode-import] Generating test cases for: ${slug}`);
    const generatedTestCases = await generateTestCases(
      leetcodeProblem.title,
      description,
      functionSignature,
      constraints,
      examples
    );

    if (generatedTestCases.length === 0) {
      warnings.push("Failed to generate test cases. You can add them manually.");
    }

    console.log(`[leetcode-import] Generating solutions for: ${slug}`);
    const generatedSolutions = await generateSolutions(
      leetcodeProblem.title,
      description,
      functionSignature,
      constraints
    );

    if (generatedSolutions.length === 0) {
      warnings.push("Failed to generate solutions. You can add them manually.");
    }

    if (!categoryId) {
      warnings.push(`Could not map category from tags: ${leetcodeProblem.topicTags.map(t => t.name).join(", ")}. Please select manually.`);
    }

    // Build response
    const result = {
      problem: {
        id: leetcodeProblem.titleSlug,
        title: leetcodeProblem.title,
        difficulty: leetcodeProblem.difficulty,
        category_id: categoryId,
        description,
        function_signature: functionSignature,
        companies,
        examples,
        constraints,
        hints: leetcodeProblem.hints || [],
        recommended_time_complexity: null,
        recommended_space_complexity: null,
      },
      testCases: generatedTestCases,
      solutions: generatedSolutions,
      warnings,
      categories: allCategories || [],
    };

    console.log(`[leetcode-import] Successfully processed: ${slug}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[leetcode-import] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
