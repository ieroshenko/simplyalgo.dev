import { useEffect, useRef } from "react";
import rough from "roughjs";

interface RoughIconProps {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  size?: number;
  colorClass?: string; // Tailwind classes with dark variants, e.g., "text-muted-foreground"
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
}

export const RoughIcon = ({
  Icon,
  size = 20,
  colorClass = "text-muted-foreground",
  roughness = 1.8,
  bowing = 1.0,
  strokeWidth = 1.5,
}: RoughIconProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const rc = rough.svg(svgRef.current);
    svgRef.current.innerHTML = ""; // Clear previous content

    const computedColor = getComputedStyle(containerRef.current).color;

    // Add a subtle rough circle background around the icon
    const circle = rc.circle(size / 2, size / 2, size * 0.9, {
      roughness,
      bowing,
      stroke: computedColor,
      strokeWidth: strokeWidth * 0.3,
      fill: "none",
      fillStyle: "solid" as const,
    });

    svgRef.current.appendChild(circle);
  }, [Icon, size, colorClass, roughness, bowing, strokeWidth]);

  return (
    <div
      ref={containerRef}
      className={`inline-flex relative ${colorClass}`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute top-0 left-0 opacity-40"
      />
      <Icon size={size} strokeWidth={strokeWidth} className="relative z-10" />
    </div>
  );
};
