/**
 * Hook for managing code insertion in Problem Solver
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { notifications } from "@/shared/services/notificationService";
import type { CodeSnippet } from "@/types";
import type { editor } from "monaco-editor";
import type { LargeInsertConfirmState, ReplacementDialogState } from "../types";

export interface UseCodeInsertionProps {
    codeEditorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
    problemDescription: string;
    setCode: (code: string) => void;
}

export interface UseCodeInsertionResult {
    /** Large insert confirmation dialog state */
    largeInsertConfirmState: LargeInsertConfirmState;
    /** Set large insert confirm state */
    setLargeInsertConfirmState: React.Dispatch<React.SetStateAction<LargeInsertConfirmState>>;
    /** Replacement dialog state */
    replacementState: ReplacementDialogState;
    /** Handle inserting a code snippet */
    handleInsertCodeSnippet: (snippet: CodeSnippet) => Promise<void>;
    /** Confirm replacement in dialog */
    handleConfirmReplacement: () => void;
    /** Cancel replacement dialog */
    handleCancelReplacement: () => void;
    /** Promise-based large insert confirmation */
    confirmLargeInsert: (options: { lineCount: number }) => Promise<boolean>;
}

/**
 * Hook to manage code insertion with AI-powered smart insertion
 */
export const useCodeInsertion = ({
    codeEditorRef,
    problemDescription,
    setCode,
}: UseCodeInsertionProps): UseCodeInsertionResult => {
    const [largeInsertConfirmState, setLargeInsertConfirmState] = useState<LargeInsertConfirmState>({
        open: false,
        lineCount: 0,
        resolve: null,
    });

    const [replacementState, setReplacementState] = useState<ReplacementDialogState>({
        showDialog: false,
        pendingCode: null,
        currentCodeForDiff: "",
    });

    const confirmLargeInsert = useCallback(({ lineCount }: { lineCount: number }): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setLargeInsertConfirmState({
                open: true,
                lineCount,
                resolve,
            });
        });
    }, []);

    const handleConfirmReplacement = useCallback(() => {
        if (!replacementState.pendingCode || !codeEditorRef.current) return;

        const currentCode = codeEditorRef.current.getValue();
        const newCodeFromBackend = replacementState.pendingCode;

        if (newCodeFromBackend === currentCode) {
            logger.info('[CodeInsertion] New code identical to current code');
            notifications.success("Code is already correct — no changes made.");
        } else {
            logger.info('[CodeInsertion] Updating editor with new code', {
                oldLength: currentCode.length,
                newLength: newCodeFromBackend.length,
            });

            codeEditorRef.current.setValue(newCodeFromBackend);
            setCode(newCodeFromBackend);

            logger.info('[CodeInsertion] Editor updated successfully');
        }

        setReplacementState({
            showDialog: false,
            pendingCode: null,
            currentCodeForDiff: "",
        });
    }, [replacementState.pendingCode, codeEditorRef, setCode]);

    const handleCancelReplacement = useCallback(() => {
        setReplacementState({
            showDialog: false,
            pendingCode: null,
            currentCodeForDiff: "",
        });
        notifications.error("Insertion canceled. No changes applied.");
    }, []);

    const handleInsertCodeSnippet = useCallback(async (snippet: CodeSnippet) => {
        logger.info('[CodeInsertion] Inserting code snippet', { snippet });

        if (!codeEditorRef.current) {
            logger.error('[CodeInsertion] Code editor ref is not available');
            notifications.error("Code editor not ready");
            return;
        }

        try {
            const editor = codeEditorRef.current;
            const currentCode = editor.getValue();
            const position = editor.getPosition();

            const cursorPosition = {
                line: position?.lineNumber ? position.lineNumber - 1 : 0,
                column: position?.column || 0,
            };

            // Use backend AI-guided insertion
            let newCodeFromBackend: string | null = null;
            let insertedAtLine: number | undefined;
            let backendRationale: string | undefined;

            logger.debug('[CodeInsertion] Starting AI-powered insertion', {
                snippetCode: snippet.code,
                currentCodeLength: currentCode.length,
                cursorPosition,
            });

            try {
                const { data, error } = await supabase.functions.invoke("ai-chat", {
                    body: {
                        action: "insert_snippet",
                        code: currentCode,
                        snippet,
                        cursorPosition,
                        problemDescription,
                        message: snippet.insertionHint?.description?.includes('coaching correction')
                            ? `[coaching correction] Fix specific issue: ${snippet.insertionHint.description}`
                            : `[ai-chat snippet insertion] Context: User asked for code fix/improvement.`,
                        conversationHistory: [],
                    },
                });

                logger.debug('[CodeInsertion] AI insertion response', {
                    error: !!error,
                    hasData: !!data,
                });

                if (error) throw error;
                if (data && typeof data.newCode === "string") {
                    newCodeFromBackend = data.newCode;
                    insertedAtLine = typeof data.insertedAtLine === "number" ? data.insertedAtLine : undefined;
                    backendRationale = typeof data.rationale === "string" ? data.rationale : undefined;
                }
            } catch (e) {
                logger.error('[CodeInsertion] AI insertion failed', { error: e });
            }

            // Client-side safety: ask before applying destructive replacements
            if (newCodeFromBackend) {
                const shrinkRatio = newCodeFromBackend.length / (currentCode.length || 1);
                const rationaleText = backendRationale || "";
                const looksDestructive =
                    shrinkRatio < 0.7 &&
                    /replaced conflicting function region|file-level replacement/i.test(rationaleText);

                if (looksDestructive && (snippet.insertionType || "smart") !== "replace") {
                    setReplacementState({
                        showDialog: true,
                        pendingCode: newCodeFromBackend,
                        currentCodeForDiff: currentCode,
                    });
                    return;
                }
            }

            if (!newCodeFromBackend) {
                notifications.error("Code insertion failed. Please try again.");
                return;
            }

            const aiMadeChanges = insertedAtLine !== undefined || (backendRationale && backendRationale.length > 0);
            const codesAreIdentical = newCodeFromBackend === currentCode;

            if (codesAreIdentical && !aiMadeChanges) {
                notifications.success("Code is already correct — no changes made.");
                return;
            }

            logger.info('[CodeInsertion] Updating editor with new code', {
                oldLength: currentCode.length,
                newLength: newCodeFromBackend.length,
                insertedAtLine,
            });

            editor.setValue(newCodeFromBackend);
            setCode(newCodeFromBackend);

            if (insertedAtLine !== undefined) {
                notifications.success(`Code inserted at line ${insertedAtLine}`);
            } else if (backendRationale) {
                notifications.success("Code updated successfully");
            } else {
                notifications.success("Code inserted");
            }
        } catch (error) {
            logger.error('[CodeInsertion] Failed to insert code snippet', { error });
            notifications.error("Failed to insert code snippet");
        }
    }, [codeEditorRef, problemDescription, setCode]);

    return {
        largeInsertConfirmState,
        setLargeInsertConfirmState,
        replacementState,
        handleInsertCodeSnippet,
        handleConfirmReplacement,
        handleCancelReplacement,
        confirmLargeInsert,
    };
};
