import { useEffect, useRef } from "react";
import { EdgeProps } from "reactflow";
import rough from "roughjs";

export const RoughEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Calculate angle from source to target
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

  // Use a dynamic offset so the arrow always stops near the target node
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const nodeEdgeOffset = Math.min(30, Math.max(12, distance * 0.12));
  const arrowSize = Math.min(14, Math.max(10, distance * 0.1));

  // Line endpoint - stops before arrow
  const lineEndX = targetX - (nodeEdgeOffset + arrowSize) * Math.cos(angle);
  const lineEndY = targetY - (nodeEdgeOffset + arrowSize) * Math.sin(angle);

  // Arrow tip - at the node edge
  const arrowTipX = targetX - nodeEdgeOffset * Math.cos(angle);
  const arrowTipY = targetY - nodeEdgeOffset * Math.sin(angle);

  // Colors based on selection state (theme-aware)
  const strokeColor =
    selected ? "hsl(var(--success))" : (style.stroke as string || "hsl(var(--primary))");
  const strokeWidth = selected ? 5 : ((style.strokeWidth as number) || 3);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = ""; // Clear previous drawings

    const rc = rough.svg(svg);

    // Draw the rough line from source to line endpoint
    const roughLine = rc.line(sourceX, sourceY, lineEndX, lineEndY, {
      roughness: 1.2,
      bowing: 1.5,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    svg.appendChild(roughLine);

    // Calculate arrow triangle points
    // The base of the arrow connects to the line endpoint
    const arrowPoint1X = arrowTipX - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = arrowTipY - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = arrowTipX - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = arrowTipY - arrowSize * Math.sin(angle + Math.PI / 6);

    // Draw arrow triangle with rough.js
    const arrowPath = rc.polygon(
      [
        [arrowTipX, arrowTipY],
        [arrowPoint1X, arrowPoint1Y],
        [arrowPoint2X, arrowPoint2Y],
      ],
      {
        roughness: 1.2,
        stroke: strokeColor,
        fill: strokeColor,
        fillStyle: "solid",
        strokeWidth: 2,
      }
    );

    svg.appendChild(arrowPath);
  }, [sourceX, sourceY, lineEndX, lineEndY, arrowTipX, arrowTipY, angle, strokeColor, strokeWidth]);

  // Create a straight line path string for the clickable area (matches the visible line)
  const straightLinePath = `M ${sourceX},${sourceY} L ${arrowTipX},${arrowTipY}`;

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          overflow: "visible",
        }}
      />
      {/* Invisible wide path for click detection - matches the visible line */}
      <path
        d={straightLinePath}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={Math.max(32, strokeWidth * 4)}
        data-id={id}
        data-edgeid={id}
        aria-label="edge-hitbox"
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
        className="react-flow__edge-path"
      />
      {/* Visual highlight when selected */}
      {selected && (
        <path
          d={straightLinePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 2}
          opacity={0.3}
          style={{ pointerEvents: "none" }}
        />
      )}
    </>
  );
};
