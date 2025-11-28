import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md m-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {variant === "destructive" && (
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmDialog;
