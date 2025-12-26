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
import { Settings } from "lucide-react";
import type { DialogUserInfo } from "../types/admin.types";

interface SetLimitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DialogUserInfo | null;
  dailyLimit: string;
  monthlyLimit: string;
  onDailyLimitChange: (value: string) => void;
  onMonthlyLimitChange: (value: string) => void;
  onSubmit: () => void;
}

export function SetLimitsDialog({
  open,
  onOpenChange,
  user,
  dailyLimit,
  monthlyLimit,
  onDailyLimitChange,
  onMonthlyLimitChange,
  onSubmit,
}: SetLimitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Set AI Token Limits
          </DialogTitle>
          <DialogDescription>
            Configure daily and monthly token limits for{" "}
            <span className="font-medium">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="daily-limit">Daily Token Limit</Label>
            <Input
              id="daily-limit"
              type="number"
              value={dailyLimit}
              onChange={(e) => onDailyLimitChange(e.target.value)}
              placeholder="100000"
            />
            <p className="text-xs text-muted-foreground">
              Default: 100,000 tokens (~$0.05/day at typical rates)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="monthly-limit">Monthly Token Limit</Label>
            <Input
              id="monthly-limit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => onMonthlyLimitChange(e.target.value)}
              placeholder="2000000"
            />
            <p className="text-xs text-muted-foreground">
              Default: 2,000,000 tokens (~$1.00/month at typical rates)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Save Limits</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
