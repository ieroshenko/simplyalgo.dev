import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

interface SessionCompleteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    completedCards: number;
    onFinish: () => void;
}

export const SessionCompleteDialog = ({
    isOpen,
    onClose,
    completedCards,
    onFinish,
}: SessionCompleteDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Session Complete! 🎉</h2>
                    <p className="text-muted-foreground mb-6">
                        You reviewed {completedCards} flashcard{completedCards !== 1 ? 's' : ''} today.
                        Great job strengthening your memory!
                    </p>
                    <Button onClick={onFinish}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finish Session
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
