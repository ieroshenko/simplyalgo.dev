import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiffEditor } from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";

interface CodeDiffDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  originalCode: string;
  modifiedCode: string;
  onAccept: () => void;
  onReject: () => void;
}

export const CodeDiffDialog = ({
  isOpen,
  onOpenChange,
  originalCode,
  modifiedCode,
  onAccept,
  onReject,
}: CodeDiffDialogProps) => {
  const { currentTheme } = useEditorTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Review Code Changes</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 relative">
          <DiffEditor
            height="100%"
            original={originalCode}
            modified={modifiedCode}
            theme={currentTheme}
            language="python"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              renderSideBySide: true,
              scrollBeyondLastLine: false,
              fontSize: 14,
            }}
          />
        </div>

        <DialogFooter className="p-4 border-t bg-background">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onReject}>
              Reject Changes
            </Button>
            <Button onClick={onAccept}>
              Accept Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
