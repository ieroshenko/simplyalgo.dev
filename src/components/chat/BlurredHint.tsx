import { useState } from "react";

interface BlurredHintProps {
  text: string;
}

export function BlurredHint({ text }: BlurredHintProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div
      className="mt-2 cursor-pointer text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border-l-4 border-blue-200 dark:border-blue-600"
      onClick={() => setIsRevealed((v) => !v)}
      role="button"
      aria-label={isRevealed ? "Hide hint" : "Click to reveal hint"}
    >
      <div className="flex items-center gap-2">
        {isRevealed ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3 h-3"
          >
            <path d="M3.53 2.47a.75.75 0 1 0-1.06 1.06l2.026 2.026C2.835 6.73 1.651 8.164.88 9.53a1.77 1.77 0 0 0 0 1.94C2.51 14.503 6.04 18 12 18c2.095 0 3.898-.437 5.393-1.152l3.077 3.077a.75.75 0 1 0 1.06-1.06L3.53 2.47ZM12 16.5c-5.18 0-8.317-3.1-9.72-5.53a.27.27 0 0 1 0-.29c.64-1.08 1.63-2.32 2.996-3.37l2.022 2.022A4.5 4.5 0 0 0 12 16.5Z" />
            <path d="M7.94 8.5 9.4 9.96A3 3 0 0 0 14.04 14.6l1.46 1.46A4.5 4.5 0 0 1 7.94 8.5Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3 h-3"
          >
            <path d="M12 6c-5.96 0-9.49 3.497-11.12 6.53a1.77 1.77 0 0 0 0 1.94C2.51 17.503 6.04 21 12 21s9.49-3.497 11.12-6.53a1.77 1.77 0 0 0 0-1.94C21.49 9.497 17.96 6 12 6Zm0 12c-4.69 0-7.67-2.804-9.28-5.47A.27.27 0 0 1 2.7 12c1.61-2.666 4.59-5.47 9.3-5.47 4.69 0 7.67 2.804 9.28 5.47a.27.27 0 0 1 0 .53C19.67 15.196 16.69 18 12 18Zm0-9a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 9Z" />
          </svg>
        )}
        <span className="text-xs font-medium">
          {isRevealed ? "Hide Hint" : "Click to reveal hint"}
        </span>
      </div>
      {isRevealed ? (
        <div className="mt-2 text-foreground">💡 {text}</div>
      ) : (
        <div className="mt-2 select-none filter blur-sm text-muted-foreground text-xs">
          This hint will help guide you to the solution...
        </div>
      )}
    </div>
  );
}
