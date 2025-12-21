import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import type { DialogUserInfo } from "../types/admin.types";

interface SetCooldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DialogUserInfo | null;
  hours: string;
  reason: string;
  onHoursChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}

export function SetCooldownDialog({
  open,
  onOpenChange,
  user,
  hours,
  reason,
  onHoursChange,
  onReasonChange,
  onSubmit,
}: SetCooldownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Set AI Cooldown
          </DialogTitle>
          <DialogDescription>
            Temporarily restrict AI access for{" "}
            <span className="font-medium">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cooldown-hours">Cooldown Duration (hours)</Label>
            <Input
              id="cooldown-hours"
              type="number"
              value={hours}
              onChange={(e) => onHoursChange(e.target.value)}
              placeholder="24"
              min="1"
            />
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => onHoursChange("1")}
              >
                1h
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => onHoursChange("6")}
              >
                6h
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => onHoursChange("24")}
              >
                24h
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => onHoursChange("72")}
              >
                3 days
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => onHoursChange("168")}
              >
                1 week
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cooldown-reason">Reason (optional)</Label>
            <Input
              id="cooldown-reason"
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Reason for cooldown"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onSubmit}>
            Apply Cooldown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
