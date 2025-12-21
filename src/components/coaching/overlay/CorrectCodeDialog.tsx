import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Check } from 'lucide-react';
import { logger } from '@/utils/logger';

interface CorrectCodeDialogProps {
    code?: string;
    onInsertCode?: () => Promise<void> | void;
    isInserting: boolean;
    onClose: () => void;
}

export const CorrectCodeDialog: React.FC<CorrectCodeDialogProps> = ({
    code,
    onInsertCode,
    isInserting,
    onClose
}) => {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code || '');
            const btn = document.getElementById('copy-code-btn');
            if (btn) {
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = 'Copy';
                }, 2000);
            }
        } catch (err) {
            logger.error('[CorrectCodeDialog] Failed to copy', { error: err });
        }
    };

    const handleInsert = async () => {
        if (onInsertCode) {
            await onInsertCode();
            onClose();
        }
    };

    return (
        <dialog
            id="correct-code-dialog"
            className="backdrop:bg-black/50 bg-card text-card-foreground rounded-lg p-0 border border-border shadow-2xl max-w-2xl w-full"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold">Correct Code</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
                        <pre>{code}</pre>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                    <Button
                        onClick={handleCopy}
                        size="sm"
                        variant="outline"
                    >
                        <span id="copy-code-btn">Copy</span>
                    </Button>
                    {onInsertCode && (
                        <Button
                            onClick={handleInsert}
                            disabled={isInserting}
                            size="sm"
                        >
                            {isInserting ? 'Inserting...' : 'Insert Code'}
                        </Button>
                    )}
                </div>
            </div>
        </dialog>
    );
};
