import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Brain } from "lucide-react";

interface EmptyStateDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EmptyStateDialog = ({
    isOpen,
    onClose,
}: EmptyStateDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <div className="text-center py-8">
                    <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
                    <p className="text-muted-foreground mb-6">
                        No flashcards are due for review right now.
                        Check back later for more practice!
                    </p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
