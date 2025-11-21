import { useEffect, useRef } from "react";
import rough from "roughjs";

interface RoughIconProps {
  Icon: any;
  size?: number;
  color: string;
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
}

export const RoughIcon = ({
  Icon,
  size = 20,
  color,
  roughness = 1.8,
  bowing = 1.0,
  strokeWidth = 1.5,
}: RoughIconProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const rc = rough.svg(svgRef.current);
    svgRef.current.innerHTML = ""; // Clear previous content

    // Add a subtle rough circle background around the icon
    const circle = rc.circle(size / 2, size / 2, size * 0.9, {
      roughness,
      bowing,
      stroke: color,
      strokeWidth: strokeWidth * 0.3,
      fill: "none",
      fillStyle: "solid" as const,
    });

    svgRef.current.appendChild(circle);
  }, [Icon, size, color, roughness, bowing, strokeWidth]);

  return (
    <div style={{ display: "inline-flex", position: "relative", width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.4 }}
      />
      <Icon size={size} color={color} strokeWidth={strokeWidth} style={{ position: "relative", zIndex: 1 }} />
    </div>
  );
};
