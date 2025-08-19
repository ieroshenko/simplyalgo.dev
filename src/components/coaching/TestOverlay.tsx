import React from "react";

interface TestOverlayProps {
  position: { x: number; y: number };
  isVisible: boolean;
}

const TestOverlay: React.FC<TestOverlayProps> = ({ position, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: "200px",
        height: "60px",
        backgroundColor: "red",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "bold",
        zIndex: 9999,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column"
      }}
    >
      <div>TEST OVERLAY</div>
      <div style={{ fontSize: "11px" }}>
        x: {position.x}, y: {position.y}
      </div>
    </div>
  );
};

export default TestOverlay;