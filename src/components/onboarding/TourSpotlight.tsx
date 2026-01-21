import React, { useEffect, useState } from 'react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourSpotlightProps {
  targetSelector: string;
  isActive: boolean;
  padding?: number;
  borderRadius?: number;
}

export const TourSpotlight: React.FC<TourSpotlightProps> = ({
  targetSelector,
  isActive,
  padding = 8,
  borderRadius = 8,
}) => {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!isActive) {
      setSpotlightRect(null);
      return;
    }

    const updateSpotlight = () => {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setSpotlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }
    };

    // Initial update
    updateSpotlight();

    // Update on resize and scroll
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    // Poll for position changes (in case of layout shifts)
    const interval = setInterval(updateSpotlight, 100);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
      clearInterval(interval);
    };
  }, [targetSelector, isActive, padding]);

  if (!isActive || !spotlightRect) {
    return null;
  }

  // Create SVG mask with cutout
  return (
    <div
      className="fixed inset-0 z-[9998] pointer-events-none"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White background means visible (opaque overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle is the cutout (transparent) */}
            <rect
              x={spotlightRect.left}
              y={spotlightRect.top}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        {/* Semi-transparent overlay with cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>
      {/* Highlight border around the target */}
      <div
        className="absolute border-2 border-primary rounded-lg shadow-lg transition-all duration-300"
        style={{
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 0 0 4px rgba(var(--primary), 0.3), 0 0 20px rgba(var(--primary), 0.2)',
        }}
      />
    </div>
  );
};
