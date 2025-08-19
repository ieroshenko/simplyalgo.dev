import React, { useState, useEffect, useMemo } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BucketSortVisualization: React.FC = () => {
  const [nums, setNums] = useState<number[]>([1, 2, 2, 3, 3, 3]);
  const [k, setK] = useState<number>(2);
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [frequencyMap, setFrequencyMap] = useState<Record<string, number>>({});
  const [buckets, setBuckets] = useState<number[][]>([]);
  const [result, setResult] = useState<number[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);

  const steps = useMemo(() => [
    "Initialize: Start with input array and k value",
    "Count frequencies: Create frequency map for each element",
    "Create buckets: Initialize buckets array (index = frequency)",
    "Fill buckets: Place elements into buckets based on their frequency",
    "Traverse buckets: Go through buckets from highest frequency to lowest",
    "Collect results: Pick k most frequent elements",
  ], []);

  const resetVisualization = () => {
    setStep(0);
    setIsPlaying(false);
    setFrequencyMap({});
    setBuckets([]);
    setResult([]);
    setCurrentHighlight(null);
  };

  const executeStep = React.useCallback(() => {
    switch (step) {
      case 0: // Initialize
        setFrequencyMap({});
        setBuckets([]);
        setResult([]);
        setCurrentHighlight("input");
        break;

      case 1: {
        // Count frequencies
        const freqMap: Record<string, number> = {};
        nums.forEach((num) => {
          const key = String(num);
          freqMap[key] = (freqMap[key] || 0) + 1;
        });
        setFrequencyMap(freqMap);
        setCurrentHighlight("frequency");
        break;
      }

      case 2: {
        // Create buckets
        const bucketsArray: number[][] = new Array(nums.length + 1)
          .fill(null)
          .map(() => [] as number[]);
        setBuckets(bucketsArray);
        setCurrentHighlight("buckets");
        break;
      }

      case 3: {
        // Fill buckets
        const newBuckets: number[][] = new Array(nums.length + 1)
          .fill(null)
          .map(() => [] as number[]);
        Object.entries(frequencyMap).forEach(([num, freq]) => {
          newBuckets[freq].push(parseInt(num, 10));
        });
        setBuckets(newBuckets);
        setCurrentHighlight("fill");
        break;
      }

      case 4: // Traverse buckets
        setCurrentHighlight("traverse");
        break;

      case 5: {
        // Collect results
        const resultArray: number[] = [];
        for (let i = buckets.length - 1; i >= 0 && resultArray.length < k; i--) {
          if (buckets[i] && buckets[i].length > 0) {
            resultArray.push(...buckets[i]);
          }
        }
        setResult(resultArray.slice(0, k));
        setCurrentHighlight("result");
        break;
      }
      default:
        break;
    }
  }, [step, nums, k, frequencyMap, buckets]);

  useEffect(() => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    if (isPlaying && step < steps.length) {
      const timer = setTimeout(() => {
        executeStep();
        setStep((prev) => prev + 1);
        if (step + 1 >= steps.length) {
          setIsPlaying(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, step, steps, steps.length, executeStep]);

  const handlePlay = () => {
    if (step >= steps.length) {
      resetVisualization();
    }
    setIsPlaying(true);
  };

  const handleStep = () => {
    if (step < steps.length) {
      executeStep();
      setStep((prev) => prev + 1);
    }
  };

  const handleInputChange = (newNums: number[], newK: number) => {
    setNums(newNums);
    setK(newK);
    resetVisualization();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-background min-h-screen">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-foreground mb-2">K Most Frequent Elements</CardTitle>
          <p className="text-muted-foreground">Bucket Sort Approach Visualization</p>
        </CardHeader>
        <CardContent>
        {/* Input Controls */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Array (comma-separated):</label>
              <input
                type="text"
                value={nums.join(",")}
                onChange={(e) => {
                  const newNums = e.target.value
                    .split(",")
                    .map((n) => parseInt(n.trim(), 10))
                    .filter((n) => !Number.isNaN(n));
                  if (newNums.length > 0) handleInputChange(newNums, k);
                }}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                placeholder="1,2,2,3,3,3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">K value:</label>
              <input
                type="number"
                value={k}
                onChange={(e) =>
                  handleInputChange(
                    nums,
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                  )
                }
                className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={handlePlay}
            disabled={isPlaying}
            variant="default"
            size="sm"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? "Playing..." : "Play"}
          </Button>

          <Button
            onClick={handleStep}
            disabled={isPlaying || step >= steps.length}
            variant="secondary"
            size="sm"
          >
            <SkipForward size={16} />
            Step
          </Button>

          <Button
            onClick={resetVisualization}
            variant="outline"
            size="sm"
          >
            <RotateCcw size={16} />
            Reset
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="text-sm font-medium text-primary mb-2">
            Step {step + 1} of {steps.length}
          </div>
          <div className="text-primary/80">{steps[step] || steps[steps.length - 1]}</div>
        </div>

        {/* Visualization */}
        <div className="space-y-6">
          {/* Input Array */}
          <div
            className={`p-4 rounded-lg border-2 ${
              currentHighlight === "input"
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <h3 className="text-lg font-semibold mb-3 text-foreground">Input Array & K</h3>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {nums.map((num, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-12 bg-muted border-2 border-border rounded-lg flex items-center justify-center font-bold text-foreground"
                  >
                    {num}
                  </div>
                ))}
              </div>
              <div className="text-xl text-foreground">K = {k}</div>
            </div>
          </div>

          {/* Frequency Map */}
          {step > 1 && (
            <div
              className={`p-4 rounded-lg border-2 ${
                currentHighlight === "frequency"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card"
              }`}
            >
              <h3 className="text-lg font-semibold mb-3 text-foreground">Frequency Map</h3>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(frequencyMap).map(([num, freq]) => (
                  <div
                    key={num}
                    className="bg-accent/20 border-2 border-accent rounded-lg p-3"
                  >
                    <div className="text-center font-bold text-foreground">{num}</div>
                    <div className="text-center text-sm text-muted-foreground">
                      appears {freq} times
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buckets */}
          {step > 2 && (
            <div
              className={`p-4 rounded-lg border-2 ${
                currentHighlight === "buckets" || currentHighlight === "fill"
                  ? "border-secondary bg-secondary/10"
                  : "border-border bg-card"
              }`}
            >
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                Buckets (Index = Frequency)
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[...buckets]
                  .map((bucket, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-foreground">Freq {idx}:</div>
                      <div className="flex gap-2 min-h-[40px] items-center">
                        {bucket.length > 0 ? (
                          bucket.map((num, numIdx) => (
                            <div
                              key={numIdx}
                              className="w-10 h-10 bg-secondary/30 border-2 border-secondary rounded-lg flex items-center justify-center font-bold text-sm text-foreground"
                            >
                              {num}
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground italic">empty</div>
                        )}
                      </div>
                    </div>
                  ))
                  .reverse()}
              </div>
            </div>
          )}

          {/* Traversal Highlight */}
          {step > 4 && (
            <div
              className={`p-4 rounded-lg border-2 ${
                currentHighlight === "traverse"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card"
              }`}
            >
              <h3 className="text-lg font-semibold mb-3 text-foreground">Bucket Traversal</h3>
              <div className="text-foreground">
                Traversing from highest frequency (index {buckets.length - 1}) to
                lowest frequency (index 0)
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Collecting elements until we have k = {k} elements
              </div>
            </div>
          )}

          {/* Result */}
          {step > 5 && (
            <div
              className={`p-4 rounded-lg border-2 ${
                currentHighlight === "result"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                Result: K Most Frequent Elements
              </h3>
              <div className="flex gap-2">
                {result.map((num, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-12 bg-primary/20 border-2 border-primary rounded-lg flex items-center justify-center font-bold text-foreground"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Algorithm Explanation */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Algorithm Complexity</h3>
          <div className="text-sm space-y-2 text-foreground">
            <div>
              <strong>Time Complexity:</strong> O(n) - where n is the length of
              input array
            </div>
            <div>
              <strong>Space Complexity:</strong> O(n) - for frequency map and
              buckets
            </div>
            <div>
              <strong>Why Bucket Sort?</strong> Since frequencies are bounded by
              array length (max n), we can use counting sort approach with
              buckets indexed by frequency, avoiding the O(n log n) sorting step.
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BucketSortVisualization;
