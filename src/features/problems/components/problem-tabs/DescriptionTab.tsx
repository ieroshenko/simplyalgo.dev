import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/hooks/useTheme";
import { renderValue } from "./utils";
import type { Problem } from "@/types";
import "katex/dist/katex.min.css";

interface DescriptionTabProps {
    problem: Problem;
}

export const DescriptionTab = ({ problem }: DescriptionTabProps) => {
    const { isDark } = useTheme();
    const syntaxTheme = isDark ? vscDarkPlus : vs;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Problem Description
                </h2>
                <div className="prose prose-sm max-w-none text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-transparent prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-border prose-strong:text-foreground prose-strong:font-semibold prose-headings:text-foreground">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                const match = /language-(\w+)/.exec(className || "");
                                const codeString = String(children).replace(/\n$/, "");
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={syntaxTheme}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: "0.375rem",
                                            fontSize: "0.875rem",
                                        }}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className}>{children}</code>
                                );
                            },
                            img({ src, alt }: { src?: string; alt?: string }) {
                                return (
                                    <div className="my-4 p-3 bg-white dark:bg-gray-100 rounded-lg border border-border">
                                        <img
                                            src={src}
                                            alt={alt || "Problem illustration"}
                                            className="max-w-full h-auto rounded shadow-sm mx-auto"
                                            style={{
                                                maxHeight: "400px",
                                                objectFit: "contain",
                                            }}
                                            loading="lazy"
                                        />
                                    </div>
                                );
                            },
                        }}
                    >
                        {problem.description}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Examples */}
            {problem.examples && problem.examples.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold text-foreground mb-3">
                        Examples
                    </h3>
                    <div className="space-y-4">
                        {problem.examples.map((example, index) => (
                            <div
                                key={index}
                                className="bg-muted/50 p-4 rounded-lg"
                            >
                                <div className="space-y-2 font-mono text-sm">
                                    <div>
                                        <span className="font-semibold">Input:</span>
                                        <pre className="mt-1 text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-2 rounded border">
                                            {renderValue(example.input)}
                                        </pre>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Output:</span>
                                        <pre className="mt-1 text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-2 rounded border">
                                            {renderValue(example.output)}
                                        </pre>
                                    </div>
                                    {example.explanation && (
                                        <div>
                                            <span className="font-semibold">Explanation:</span>
                                            <div className="prose prose-sm max-w-none text-muted-foreground mt-1">
                                                <p>{example.explanation}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommended Complexity */}
            <div>
                <h3 className="text-md font-semibold text-foreground mb-3">
                    Recommended Time & Space Complexity
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                        • Time: {problem.recommendedTimeComplexity || "—"}
                    </li>
                    <li>
                        • Space: {problem.recommendedSpaceComplexity || "—"}
                    </li>
                </ul>
            </div>
        </div>
    );
};
