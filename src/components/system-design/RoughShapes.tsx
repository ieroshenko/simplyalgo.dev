import { useEffect, useRef, ReactNode } from "react";
import rough from "roughjs";

interface RoughShapeProps {
  children: ReactNode;
  width: number;
  height: number;
  color: string;
  bgColor: string;
  shape?: "rectangle" | "circle" | "diamond" | "cylinder";
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
}

export const RoughShape = ({
  children,
  width,
  height,
  color,
  bgColor,
  shape = "rectangle",
  roughness = 1.5,
  bowing = 0.8,
  strokeWidth = 2,
}: RoughShapeProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const rc = rough.svg(svgRef.current);
    svgRef.current.innerHTML = ""; // Clear previous drawings

    const options = {
      roughness,
      bowing,
      stroke: color,
      strokeWidth,
      fill: bgColor,
      fillStyle: "solid" as const,
    };

    let shapeElement;

    switch (shape) {
      case "rectangle":
        shapeElement = rc.rectangle(0, 0, width, height, {
          ...options,
          fillWeight: 0.5,
        });
        break;

      case "circle":
        {
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) / 2;
          shapeElement = rc.circle(centerX, centerY, radius * 2, {
            ...options,
            fillStyle: "dashed" as const,
          });
        }
        break;

      case "diamond":
        {
          const centerX = width / 2;
          const centerY = height / 2;
          const points: [number, number][] = [
            [centerX, 0],                    // top
            [width, centerY],                // right
            [centerX, height],               // bottom
            [0, centerY],                    // left
          ];
          shapeElement = rc.polygon(points, options);
        }
        break;

      case "cylinder":
        {
          // Draw cylinder using multiple rough primitives
          const topEllipseHeight = height * 0.15;
          const bottomY = height - topEllipseHeight;

          // Top ellipse
          const topEllipse = rc.ellipse(width / 2, topEllipseHeight / 2, width, topEllipseHeight, {
            ...options,
            fill: bgColor,
          });

          // Body rectangle
          const body = rc.rectangle(0, topEllipseHeight / 2, width, bottomY, {
            ...options,
            fill: bgColor,
          });

          // Bottom ellipse
          const bottomEllipse = rc.ellipse(width / 2, bottomY + topEllipseHeight / 2, width, topEllipseHeight, {
            ...options,
            fill: bgColor,
          });

          // Separator line
          const separator = rc.line(0, topEllipseHeight, width, topEllipseHeight, {
            stroke: color,
            strokeWidth: strokeWidth * 0.5,
            roughness: roughness * 0.8,
          });

          svgRef.current.appendChild(topEllipse);
          svgRef.current.appendChild(body);
          svgRef.current.appendChild(bottomEllipse);
          svgRef.current.appendChild(separator);

          return; // Skip the default append
        }

      default:
        shapeElement = rc.rectangle(0, 0, width, height, options);
    }

    if (shapeElement) {
      svgRef.current.appendChild(shapeElement);
    }
  }, [width, height, color, bgColor, shape, roughness, bowing, strokeWidth]);

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 pointer-events-none"
      />
      <div
        className="relative z-10 w-full h-full flex items-center justify-center px-4 py-3"
      >
        {children}
      </div>
    </div>
  );
};
