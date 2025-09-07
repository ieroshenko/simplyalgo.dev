import React, { useEffect, useMemo, useRef } from "react";
// Dynamically import mermaid to avoid bundler MIME/type issues and reduce initial bundle size

type MermaidProps = {
  chart: string;
  className?: string;
  caption?: string;
};

// Minimal safe config: disable htmlLabels to reduce XSS surface
const baseConfig: any = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    primaryColor: "#FFB88A",
    primaryTextColor: "#1f2937",
    primaryBorderColor: "#ffa94d",
    lineColor: "#ffa94d",
    textColor: "#1f2937",
    noteBkgColor: "#fff4e6",
    noteTextColor: "#374151",
  },
};

export default function Mermaid({ chart, className, caption }: MermaidProps) {
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer ESM builds; fall back to package entry if needed
        const mod: any = await import("mermaid/dist/mermaid.esm.min.mjs")
          .catch(() => import("mermaid/dist/mermaid.esm.mjs"))
          .catch(() => import("mermaid"));
        const mm = mod?.default ?? mod;
        if (!mm || cancelled) return;
        mm.initialize(baseConfig);
        // Sanitize: collapse newlines within bracketed labels to avoid parser errors
        const sanitized = chart.replace(/\[(?:[^\]\n]|\\.|\n)*\]/g, (label) =>
          label.replace(/\n+/g, " "),
        );
        const { svg } = await mm.render(id, sanitized);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const el = containerRef.current.querySelector('svg') as SVGElement | null;
          if (el) {
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
          }
        }
      } catch (e) {
        if (!cancelled && containerRef.current) {
          console.error("Mermaid rendering error:", e);
          containerRef.current.innerHTML =
            '<div class="text-destructive text-xs">Failed to render diagram</div>';
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <figure className={className}>
      <div ref={containerRef} className="overflow-auto max-w-full" />
      {caption && (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
