import { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface AudioWaveformProps {
  isActive: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected";
  audioAnalyser?: AnalyserNode;
}

const AudioWaveform = ({ isActive, connectionStatus, audioAnalyser }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (isActive && audioAnalyser && connectionStatus === "connected") {
        // Real audio visualization
        const bufferLength = audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioAnalyser.getByteFrequencyData(dataArray);

        const barCount = 50;
        const barWidth = width / barCount;
        const gap = 2;

        // Get theme color
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim() || "262.1 83.3% 57.8%";

        // Convert HSL to RGB
        const [h, s, l] = primaryColor.split(" ").map(v => parseFloat(v));
        const rgb = hslToRgb(h / 360, s / 100, l / 100);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * bufferLength);
          const value = dataArray[dataIndex] / 255;
          const barHeight = value * height * 0.8;

          const x = i * barWidth;
          const y = (height - barHeight) / 2;

          // Create gradient
          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
          gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);

          ctx.fillStyle = gradient;
          ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
        }
      } else if (isActive || connectionStatus === "connecting") {
        // Idle animation
        const time = Date.now() / 1000;
        const barCount = 50;
        const barWidth = width / barCount;
        const gap = 2;

        // Get theme color
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim() || "262.1 83.3% 57.8%";

        const [h, s, l] = primaryColor.split(" ").map(v => parseFloat(v));
        const rgb = hslToRgb(h / 360, s / 100, l / 100);

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time * 2 + i * 0.2) * 0.3 + 0.3;
          const barHeight = wave * height * 0.6;

          const x = i * barWidth;
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
          gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);

          ctx.fillStyle = gradient;
          ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
        }
      } else {
        // Flat line when inactive
        const centerY = height / 2;
        const muted = getComputedStyle(document.documentElement)
          .getPropertyValue("--muted-foreground")
          .trim();

        ctx.strokeStyle = muted || "#888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, connectionStatus, audioAnalyser]);

  // Helper function to convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  return (
    <div className="relative w-full h-64 flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Status overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          isActive && connectionStatus === "connected"
            ? "bg-primary/20"
            : "bg-muted"
        }`}>
          {isActive && connectionStatus === "connected" ? (
            <Mic className="w-8 h-8 text-primary" />
          ) : (
            <MicOff className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {!isActive
            ? "Ready to start interview"
            : connectionStatus === "connecting"
            ? "Connecting to interviewer..."
            : "Interview in progress"}
        </p>
      </div>
    </div>
  );
};

export default AudioWaveform;
