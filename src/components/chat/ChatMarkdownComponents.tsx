import { CodeBlockWithInsert } from "./CodeBlockWithInsert";
import type { CodeSnippet } from "@/types";

interface MarkdownComponentProps {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
}

interface CodeProps extends MarkdownComponentProps {
    className?: string;
    children?: React.ReactNode;
}

interface ChatMarkdownComponentsProps {
    onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
    hoveredMessageId: string | null;
    messageId: string;
}

export const createChatMarkdownComponents = ({
    onInsertCodeSnippet,
    hoveredMessageId,
    messageId,
}: ChatMarkdownComponentsProps) => ({
    em({ children, ...props }: MarkdownComponentProps) {
        return <strong {...props}>{children}</strong>;
    },
    strong({ children, ...props }: MarkdownComponentProps) {
        return <strong {...props}>{children}</strong>;
    },
    code({ className, children, ...props }: CodeProps) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1] || "python";
        const isBlock = !!match;

        if (isBlock) {
            const hovered = hoveredMessageId === messageId;
            return (
                <CodeBlockWithInsert
                    code={String(children)}
                    lang={lang}
                    onInsert={onInsertCodeSnippet}
                    showOverride={hovered}
                />
            );
        }
        return (
            <em
                className="text-blue-600 dark:text-blue-400 font-medium"
                {...props}
            >
                {children}
            </em>
        );
    },
    p: ({ children }: MarkdownComponentProps) => <p>{children}</p>,
    ul: ({ children }: MarkdownComponentProps) => (
        <ul className="list-disc list-outside pl-5 mb-2">
            {children}
        </ul>
    ),
    ol: ({ children }: MarkdownComponentProps) => (
        <ol className="list-decimal list-outside pl-5 mb-2">
            {children}
        </ol>
    ),
    li: ({ children }: MarkdownComponentProps) => (
        <li className="mb-1">{children}</li>
    ),
});
