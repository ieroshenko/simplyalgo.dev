/* eslint-disable @typescript-eslint/no-explicit-any */
import { llmText, llmJson } from "./openai-utils.ts";
import { ChatMessage, FlowGraph, FlowNode, FlowEdge } from "./types.ts";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Diagram engine preference - set DIAGRAM_ENGINE=reactflow or mermaid
const preferredDiagramEngine = (Deno.env.get("DIAGRAM_ENGINE") || "reactflow")
  .toLowerCase()
  .trim();
const validEngines = ["reactflow", "mermaid"];
const diagramEngine = validEngines.includes(preferredDiagramEngine)
  ? preferredDiagramEngine
  : "reactflow";

console.log(
  `[ai-chat] Diagram engine: ${diagramEngine} (${Deno.env.get("DIAGRAM_ENGINE") ? "env configured" : "defaulted"})`,
);

/**
 * Validate React Flow graph structure
 */
function validateFlowGraph(graph: unknown): graph is FlowGraph {
  console.log(
    "[Validation] Starting validation for:",
    JSON.stringify(graph, null, 2),
  );

  if (!graph || typeof graph !== "object") {
    console.log("[Validation] Failed: graph is not an object");
    return false;
  }

  const g = graph as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(g.nodes)) {
    console.log(
      "[Validation] Failed: nodes is not an array, got:",
      typeof g.nodes,
    );
    return false;
  }
  if (!Array.isArray(g.edges)) {
    console.log(
      "[Validation] Failed: edges is not an array, got:",
      typeof g.edges,
    );
    return false;
  }

  console.log(
    `[Validation] Found ${g.nodes.length} nodes and ${g.edges.length} edges`,
  );

  const idSet = new Set<string>();
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    const node = n as FlowNode;
    console.log(
      `[Validation] Checking node ${i}:`,
      JSON.stringify(node, null, 2),
    );

    if (!node || typeof node.id !== "string") {
      console.log(
        `[Validation] Failed: node ${i} has invalid id:`,
        typeof node?.id,
      );
      return false;
    }
    if (
      !node.position ||
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      console.log(
        `[Validation] Failed: node ${i} has invalid position:`,
        node.position,
      );
      return false;
    }
    if (!node.data || typeof node.data.label !== "string") {
      console.log(
        `[Validation] Failed: node ${i} has invalid data:`,
        node.data,
      );
      return false;
    }
    if (idSet.has(node.id)) {
      console.log(`[Validation] Failed: duplicate node id: ${node.id}`);
      return false;
    }
    idSet.add(node.id);
  }

  for (let i = 0; i < g.edges.length; i++) {
    const e = g.edges[i];
    const edge = e as FlowEdge;
    console.log(
      `[Validation] Checking edge ${i}:`,
      JSON.stringify(edge, null, 2),
    );

    if (
      !edge ||
      typeof edge.id !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    ) {
      console.log(`[Validation] Failed: edge ${i} has invalid properties:`, {
        id: typeof edge?.id,
        source: typeof edge?.source,
        target: typeof edge?.target,
      });
      return false;
    }
  }

  console.log("[Validation] All checks passed!");
  return true;
}

/**
 * Try to generate a React Flow diagram first; fallback to Mermaid
 */
export async function maybeGenerateDiagram(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[],
  force = false,
  preferredEngines?: Array<"reactflow" | "mermaid">,
): Promise<
  | { engine: "reactflow"; graph: FlowGraph; title?: string }
  | { engine: "mermaid"; code: string; title?: string }
  | undefined
> {
  const wantsDiagram =
    /\b(visualize|diagram|draw|show.*diagram|mermaid|flow|graph)\b/i.test(
      message,
    );
  if (!force && !wantsDiagram) return undefined;
  
  // Use configured diagram engine preference
  const defaultOrder: Array<"reactflow" | "mermaid"> =
    diagramEngine === "reactflow"
      ? ["reactflow", "mermaid"]
      : ["mermaid", "reactflow"];

  const engineOrder: Array<"reactflow" | "mermaid"> =
    Array.isArray(preferredEngines) && preferredEngines.length
      ? (Array.from(new Set(preferredEngines.concat(defaultOrder))) as Array<
          "reactflow" | "mermaid"
        >)
      : defaultOrder;

  const rfPrompt = `Create a React Flow diagram that visualizes the algorithm step-by-step with meaningful progression.

CRITICAL: Output ONLY valid JSON. Start with { and end with }. No markdown fences, no explanation.

OUTPUT FORMAT (copy structure exactly):
{
  "reactflow": {
    "nodes": [
      {"id": "n1", "type": "default", "data": {"label": "Initialize variables"}, "position": {"x": 100, "y": 50}},
      {"id": "n2", "type": "default", "data": {"label": "Check condition"}, "position": {"x": 100, "y": 150}},
      {"id": "n3", "type": "default", "data": {"label": "Process step"}, "position": {"x": 100, "y": 250}}
    ],
    "edges": [
      {"id": "e1", "source": "n1", "target": "n2"},
      {"id": "e2", "source": "n2", "target": "n3"}
    ]
  }
}

REQUIREMENTS:
- Create 6-10 nodes showing algorithm flow
- Include key algorithmic concepts: initialization, loops, conditions, updates
- For data structures: show operations like "compare", "merge", "split", "traverse"
- For search algorithms: show "check condition", "update bounds", "found/not found"
- For dynamic programming: show "base case", "recurrence", "memoize"
- For sorting: show "partition", "merge", "swap"
- Use decision branches for conditional logic (spread horizontally +200px)
- Show meaningful progression that teaches the approach
- Space vertically +100px, horizontally +200px for branches
- Node labels max 25 characters, clear and educational
- Simple IDs: n1, n2, n3, etc.

Problem context: ${problemDescription}
User request: ${message}
Conversation context: ${conversationHistory
    .slice(-3)
    .map((m) => m.content)
    .join(" ")
    .substring(0, 300)}

Create an educational algorithm visualization:`;

  // Attempt functions
  const tryReactFlow = async (): Promise<
    | { ok: true; diagram: { engine: "reactflow"; graph: FlowGraph } }
    | { ok: false; reason: string }
  > => {
    let raw = "";
    try {
      raw = (
        await llmJson(rfPrompt, { temperature: 0.2, maxTokens: 1200 })
      ).trim();
      console.log(
        "[React Flow] Raw AI response:",
        raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
      );
    } catch (e) {
      console.log("[React Flow] llmJson failed, trying llmText:", e);
      try {
        raw = (
          await llmText(rfPrompt, { temperature: 0.2, maxTokens: 1200 })
        ).trim();
        console.log(
          "[React Flow] Raw AI response from llmText:",
          raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
        );
      } catch (e2) {
        console.log("[React Flow] Both llmJson and llmText failed:", e2);
        return {
          ok: false,
          reason: `Responses+fallback failed: ${(e2 as Error)?.message || "unknown error"}`,
        };
      }
    }
    if (!raw) {
      console.log("[React Flow] Empty response");
      return { ok: false, reason: "Empty response for reactflow JSON" };
    }
    try {
      // Clean the response to extract JSON
      let cleanJson = raw.trim();

      // Remove markdown code blocks if present
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson
          .replace(/^```(?:json)?/m, "")
          .replace(/```$/m, "")
          .trim();
      }

      // Try to find JSON object boundaries
      const jsonStart = cleanJson.indexOf("{");
      const jsonEnd = cleanJson.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }

      console.log("[React Flow] Cleaned JSON:", cleanJson);

      const parsed = JSON.parse(cleanJson);
      console.log("[React Flow] Parsed JSON:", JSON.stringify(parsed, null, 2));
      // Accept either { reactflow: { nodes, edges } } or a top-level { nodes, edges }
      const rfCandidate = (parsed && ((parsed as any).reactflow ?? parsed)) as unknown;
      const rf = rfCandidate as FlowGraph;
      if (!rf || typeof rf !== "object") {
        console.log("[React Flow] No suitable reactflow object found in JSON");
        return { ok: false, reason: "No reactflow object in JSON" };
      }
      console.log(
        "[React Flow] Candidate reactflow data:",
        JSON.stringify(rf, null, 2),
      );
      if (validateFlowGraph(rf)) {
        console.log("[React Flow] Validation passed, returning diagram");
        return { ok: true, diagram: { engine: "reactflow", graph: rf } };
      }
      console.log("[React Flow] Schema validation failed for candidate");
      return { ok: false, reason: "Schema validation failed" };
    } catch (parseErr) {
      console.log("[React Flow] JSON parse error:", parseErr, "Raw:", raw);
      return {
        ok: false,
        reason: `Invalid JSON: ${(parseErr as Error)?.message || "parse error"}`,
      };
    }
  };

  const mermaidPrompt = `Output ONLY a JSON with a simple Mermaid flowchart. Use this exact format:

{
  "mermaid": "flowchart TD\\n    A[Start] --> B[Compare]\\n    B --> C[Choose smaller]\\n    C --> D[End]"
}

RULES:
- Use "flowchart TD" syntax only
- Maximum 8 nodes for simplicity  
- Node labels must be simple text in brackets: [Text here]
- Use --> for arrows
- No special characters except spaces and hyphens in labels
- Each line must end with \\n
- Keep labels under 15 characters

For: ${problemDescription.split(".")[0]}
User request: ${message}

Output only the JSON:`;

  const tryMermaid = async (): Promise<
    | { ok: true; diagram: { engine: "mermaid"; code: string } }
    | { ok: false; reason: string }
  > => {
    let mermaidRaw = "";
    try {
      mermaidRaw = (
        await llmJson(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })
      ).trim();
    } catch (e) {
      try {
        mermaidRaw = (
          await llmText(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })
        ).trim();
      } catch (e2) {
        return {
          ok: false,
          reason: `Responses+fallback failed: ${(e2 as Error)?.message || "unknown error"}`,
        };
      }
    }
    if (!mermaidRaw)
      return { ok: false, reason: "Empty response for mermaid JSON" };
    let mermaidCode = "";
    try {
      const parsed = JSON.parse(mermaidRaw);
      if (parsed && typeof (parsed as any).mermaid === "string") {
        mermaidCode = String((parsed as any).mermaid);
      }
    } catch (parseErr) {
      const fence = mermaidRaw.match(/```mermaid([\s\S]*?)```/i);
      if (fence && fence[1]) {
        mermaidCode = fence[1];
      } else if (/flowchart\s+LR|graph\s+LR/i.test(mermaidRaw)) {
        mermaidCode = mermaidRaw;
      } else {
        return {
          ok: false,
          reason: `Invalid JSON and no fence: ${(parseErr as Error)?.message || "parse error"}`,
        };
      }
    }
    const sanitized = (mermaidCode || "")
      .replace(/^```mermaid\n?/i, "")
      .replace(/```$/i, "")
      .trim();
    if (!sanitized)
      return { ok: false, reason: "Mermaid content empty after sanitization" };
    return { ok: true, diagram: { engine: "mermaid", code: sanitized } };
  };

  const tried: Array<"reactflow" | "mermaid"> = [];
  const debug: {
    reactflow?: { ok: boolean; reason?: string };
    mermaid?: { ok: boolean; reason?: string };
  } = {};

  console.log("[Diagram Generation] Engine order:", engineOrder);

  for (const engine of engineOrder) {
    console.log(`[Diagram Generation] Trying engine: ${engine}`);
    if (engine === "reactflow") {
      tried.push("reactflow");
      const rf = await tryReactFlow();
      if (rf.ok) {
        console.log("[Diagram Generation] React Flow succeeded");
        return rf.diagram;
      }
      console.log("[Diagram Generation] React Flow failed:", rf.reason);
      debug.reactflow = { ok: false, reason: rf.reason };
    } else if (engine === "mermaid") {
      tried.push("mermaid");
      const mm = await tryMermaid();
      if (mm.ok) {
        console.log("[Diagram Generation] Mermaid succeeded");
        return mm.diagram;
      }
      console.log("[Diagram Generation] Mermaid failed:", mm.reason);
      debug.mermaid = { ok: false, reason: mm.reason };
    }
  }

  // No diagram; attach debug info to console
  console.warn("[ai-chat] Diagram generation failed", {
    tried: engineOrder,
    ...debug,
  });
  return undefined;
}

/**
 * Generate a brief, friendly explanation of a given Mermaid diagram
 */
export async function explainMermaid(
  mermaidCode: string,
  problemDescription: string,
): Promise<string> {
  const explainPrompt = `You are a helpful tutor. In 2-4 short bullet points, explain the following Mermaid diagram for a coding problem. Avoid code, be concise, no questions.

Problem context (for reference): ${problemDescription}

Diagram (Mermaid DSL):\n${mermaidCode}`;

  const text = await llmText(explainPrompt, {
    temperature: 0.5,
    maxTokens: 180,
  });
  return text?.trim() || "Here is the diagram.";
}
