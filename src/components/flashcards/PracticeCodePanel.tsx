import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import Editor from "@monaco-editor/react";
import type { ProblemData } from "./types";
import type { FlashcardDeck } from "@/types/api";

interface PracticeCodePanelProps {
    problemData: ProblemData | null;
    currentCard: FlashcardDeck | null;
    currentCardIndex: number;
    editorTheme: string;
    defineCustomThemes: (monaco: unknown) => void;
    onEditorReady: () => void;
    onSkipCard: () => void;
    onRateMemory: () => void;
}

export const PracticeCodePanel = ({
    problemData,
    currentCard,
    currentCardIndex,
    editorTheme,
    defineCustomThemes,
    onEditorReady,
    onSkipCard,
    onRateMemory,
}: PracticeCodePanelProps) => {
    return (
        <>
            {/* Code Practice Area */}
            <div className="flex-1 p-6 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Try to Recall Your Solution</h3>
                    <p className="text-sm text-muted-foreground">
                        Write out your solution or pseudocode below. Click "Show Solution" when ready to compare.
                    </p>
                </div>

                {/* Editable Code Editor */}
                <div className="flex-1 min-h-0">
                    {problemData?.function_signature ? (
                        <div className="h-full rounded overflow-hidden border">
                            <Editor
                                key={`practice-${currentCard?.problem_id}-${currentCardIndex}`}
                                height="100%"
                                language="python"
                                theme={editorTheme}
                                defaultValue={problemData.function_signature}
                                loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
                                options={{
                                    minimap: { enabled: false },
                                    lineNumbers: 'on',
                                    folding: false,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    renderWhitespace: 'none',
                                    fontSize: 13,
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                    readOnly: false,
                                    tabSize: 4,
                                    insertSpaces: true,
                                }}
                                onMount={(editor, monaco) => {
                                    defineCustomThemes(monaco);
                                    onEditorReady();
                                    editor.focus();
                                }}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border rounded bg-muted/20">
                            <div className="text-center">
                                <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm text-muted-foreground">
                                    Loading problem signature...
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 border-t">
                <div className="flex justify-between items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSkipCard}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Skip Card
                    </Button>

                    <Button onClick={onRateMemory}>
                        Rate My Memory
                    </Button>
                </div>
            </div>
        </>
    );
};
