import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Keyboard } from "lucide-react";
import { useMemo } from "react";

type ShortcutsHelpProps = {
  className?: string;
};

const getIsMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = nav.userAgentData?.platform || navigator.platform || "";
  return /mac/i.test(p);
};

const ShortcutsHelp = ({ className }: ShortcutsHelpProps) => {
  const isMac = useMemo(() => getIsMac(), []);
  const CMD = isMac ? "⌘" : "Ctrl";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className || "text-muted-foreground hover:text-foreground"}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 overflow-hidden">
        <div className="border-b px-3 py-2 bg-muted/50">
          <div className="text-xs font-medium text-muted-foreground">Shortcuts</div>
          <div className="text-sm font-semibold">Panels & Testing</div>
        </div>
        <ul className="p-3 space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Toggle Description</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs border">
              {CMD}+B
            </kbd>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Toggle Tests</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs border">
              {CMD}+J
            </kbd>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Toggle Chat</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs border">
              {CMD}+L
            </kbd>
          </li>
        </ul>
        <div className="px-3 py-2 text-xs text-muted-foreground border-t">
          Tips: Press Esc to refocus the editor.
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShortcutsHelp;


