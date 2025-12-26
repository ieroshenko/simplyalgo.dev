import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Mermaid from "@/components/diagram/Mermaid";
import type { CodeSnippet } from "@/types";

interface CodeBlockWithInsertProps {
  code: string;
  lang: string;
  onInsert?: (snippet: CodeSnippet) => void;
  showOverride?: boolean;
}

export function CodeBlockWithInsert({
  code,
  lang,
  onInsert,
  showOverride,
}: CodeBlockWithInsertProps) {
  const [showLocal, setShowLocal] = useState(false);
  const isMermaid = lang === "mermaid";
  const visible = showOverride !== undefined ? showOverride : showLocal;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowLocal(true)}
      onMouseLeave={() => setShowLocal(false)}
    >
      {isMermaid ? (
        <Mermaid chart={code} />
      ) : (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang || "python"}
          PreTag="div"
          className="rounded-xl !mt-3 !mb-2 !text-sm"
          customStyle={{
            whiteSpace: "pre",
            overflowX: "auto",
            padding: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {code.replace(/\n$/, "")}
        </SyntaxHighlighter>
      )}
      {onInsert && !isMermaid && (
        <button
          onClick={() => {
            const snippet: CodeSnippet = {
              id: `direct-${Date.now()}`,
              code: code.replace(/\n$/, ""),
              language: "python",
              isValidated: true,
              insertionType: "smart",
              insertionHint: {
                type: "statement",
                scope: "function",
                description:
                  "Code snippet from AI response - may be a bug fix or improvement",
              },
            };
            onInsert(snippet);
          }}
          className={`absolute top-3 right-3 z-20 bg-white/90 hover:bg-white text-stone-700 text-xs px-2.5 py-1.5 rounded-lg shadow-md border border-stone-200/50 backdrop-blur-sm pointer-events-auto transition-all duration-150 flex items-center gap-1.5 font-medium ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          title="Add to Editor"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </button>
      )}
    </div>
  );
}
