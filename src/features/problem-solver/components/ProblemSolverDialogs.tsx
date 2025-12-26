import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CodeDiffDialog } from '@/components/CodeDiffDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type LargeInsertConfirmState = {
  open: boolean;
  lineCount: number;
  resolve: ((value: boolean) => void) | null;
};

type ProblemSolverDialogsProps = {
  fullscreenOpen: boolean;
  setFullscreenOpen: (open: boolean) => void;
  fullscreenTitle: string;
  fullscreenCode: string;
  fullscreenLang: string;
  currentTheme: string;
  defineCustomThemes: (monaco: Monaco) => void;

  showReplacementDialog: boolean;
  setShowReplacementDialog: (open: boolean) => void;
  currentCodeForDiff: string;
  pendingReplacementCode: string | null;
  onConfirmReplacement: () => void;
  onCancelReplacement: () => void;

  largeInsertConfirmState: LargeInsertConfirmState;
  setLargeInsertConfirmState: (s: LargeInsertConfirmState) => void;
};

export const ProblemSolverDialogs = ({
  fullscreenOpen,
  setFullscreenOpen,
  fullscreenTitle,
  fullscreenCode,
  fullscreenLang,
  currentTheme,
  defineCustomThemes,

  showReplacementDialog,
  setShowReplacementDialog,
  currentCodeForDiff,
  pendingReplacementCode,
  onConfirmReplacement,
  onCancelReplacement,

  largeInsertConfirmState,
  setLargeInsertConfirmState,
}: ProblemSolverDialogsProps) => {
  return (
    <>
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[90vw] p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">{fullscreenTitle}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="border rounded">
              <Editor
                height="80vh"
                defaultLanguage={fullscreenLang}
                value={fullscreenCode}
                theme={currentTheme}
                onMount={(_, monaco) => {
                  defineCustomThemes(monaco);
                }}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  lineNumbers: 'on',
                  folding: true,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                  fontSize: 15,
                  wordWrap: 'off',
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CodeDiffDialog
        isOpen={showReplacementDialog}
        onOpenChange={setShowReplacementDialog}
        originalCode={currentCodeForDiff}
        modifiedCode={pendingReplacementCode || ''}
        onAccept={onConfirmReplacement}
        onReject={onCancelReplacement}
      />

      <AlertDialog
        open={largeInsertConfirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            const resolve = largeInsertConfirmState.resolve;
            setLargeInsertConfirmState({ open: false, lineCount: 0, resolve: null });
            resolve?.(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply large fix?</AlertDialogTitle>
            <AlertDialogDescription>
              This suggestion is fairly large ({largeInsertConfirmState.lineCount} lines) and may replace part of your function.
              Review it carefully before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                const resolve = largeInsertConfirmState.resolve;
                setLargeInsertConfirmState({ open: false, lineCount: 0, resolve: null });
                resolve?.(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const resolve = largeInsertConfirmState.resolve;
                setLargeInsertConfirmState({ open: false, lineCount: 0, resolve: null });
                resolve?.(true);
              }}
            >
              Insert Code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
