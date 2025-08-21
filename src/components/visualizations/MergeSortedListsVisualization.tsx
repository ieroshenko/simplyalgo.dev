import React, { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MergeSortedListsVisualization = () => {
  const [list1, setList1] = useState([1, 2, 4]);
  const [list2, setList2] = useState([1, 3, 4]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1000);

  // Algorithm state
  const [pointer1, setPointer1] = useState(0);
  const [pointer2, setPointer2] = useState(0);
  const [mergedList, setMergedList] = useState([]);
  const [currentComparison, setCurrentComparison] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    {
      action: "init",
      description: "Initialize two pointers at the start of each list",
    },
    {
      action: "compare",
      description: "Compare current elements and add smaller one to result",
    },
    {
      action: "advance",
      description: "Move pointer of the selected list forward",
    },
    {
      action: "complete",
      description: "Add remaining elements from non-empty list",
    },
  ];

  const resetVisualization = () => {
    setPointer1(0);
    setPointer2(0);
    setMergedList([]);
    setCurrentComparison(null);
    setIsComplete(false);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const executeStep = useCallback(() => {
    if (isComplete) return;

    if (pointer1 >= list1.length && pointer2 >= list2.length) {
      setIsComplete(true);
      setIsPlaying(false);
      setCurrentComparison(null);
      return;
    }

    if (pointer1 >= list1.length) {
      // Add remaining from list2
      setMergedList((prev) => [...prev, list2[pointer2]]);
      setPointer2((prev) => prev + 1);
      setCurrentComparison({
        type: "remaining",
        list: 2,
        value: list2[pointer2],
      });
    } else if (pointer2 >= list2.length) {
      // Add remaining from list1
      setMergedList((prev) => [...prev, list1[pointer1]]);
      setPointer1((prev) => prev + 1);
      setCurrentComparison({
        type: "remaining",
        list: 1,
        value: list1[pointer1],
      });
    } else {
      // Compare and add smaller
      const val1 = list1[pointer1];
      const val2 = list2[pointer2];

      if (val1 <= val2) {
        setMergedList((prev) => [...prev, val1]);
        setPointer1((prev) => prev + 1);
        setCurrentComparison({ type: "compare", winner: 1, val1, val2 });
      } else {
        setMergedList((prev) => [...prev, val2]);
        setPointer2((prev) => prev + 1);
        setCurrentComparison({ type: "compare", winner: 2, val1, val2 });
      }
    }

    setCurrentStep((prev) => prev + 1);
  }, [isComplete, pointer1, pointer2, list1, list2]);

  const handlePlay = () => {
    if (isComplete) {
      resetVisualization();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleInputChange = (listType, value) => {
    const numbers = value
      .split(",")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));
    if (listType === 1) {
      setList1(numbers.sort((a, b) => a - b));
    } else {
      setList2(numbers.sort((a, b) => a - b));
    }
    resetVisualization();
  };

  useEffect(() => {
    let interval;
    if (isPlaying && !isComplete) {
      interval = setInterval(executeStep, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isComplete, pointer1, pointer2, speed, executeStep]);

  const ListNode = ({ value, isActive, isPointer, listType }) => (
    <div
      className={`
      flex items-center justify-center w-12 h-12 rounded-lg border-2 font-mono font-bold
      ${isActive ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg" : "bg-card border-border text-foreground"}
      ${isPointer ? `border-accent border-4` : ""}
      transition-all duration-300
    `}
    >
      {value}
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center w-8 h-8">
      <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-muted-foreground"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-background rounded-xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-foreground">
            Merge Two Sorted Linked Lists
          </CardTitle>
        </CardHeader>
        <CardContent>

        {/* Algorithm Explanation */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            Algorithm Overview
          </h2>
          <p className="text-muted-foreground mb-2">
            Use two pointers to traverse both lists simultaneously. Compare
            current elements and add the smaller one to the result list.
          </p>
          <div className="bg-muted p-3 rounded font-mono text-sm">
            <div className="text-foreground">
              Time Complexity: O(m + n) where m, n are list lengths
            </div>
            <div className="text-foreground">
              Space Complexity: O(1) for iterative, O(m + n) for recursive
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg border">
            <label className="block text-sm font-medium mb-2 text-foreground">
              List 1 (comma-separated)
            </label>
            <input
              type="text"
              value={list1.join(", ")}
              onChange={(e) => handleInputChange(1, e.target.value)}
              className="w-full p-2 border border-input rounded bg-background text-foreground focus:ring-2 focus:ring-primary"
              placeholder="1, 2, 4"
            />
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <label className="block text-sm font-medium mb-2 text-foreground">
              List 2 (comma-separated)
            </label>
            <input
              type="text"
              value={list2.join(", ")}
              onChange={(e) => handleInputChange(2, e.target.value)}
              className="w-full p-2 border border-input rounded bg-background text-foreground focus:ring-2 focus:ring-primary"
              placeholder="1, 3, 4"
            />
          </div>
        </div>

        {/* Visualization */}
        <div className="bg-card rounded-lg p-6 border mb-6">
        {/* List 1 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-accent">List 1</h3>
          <div className="flex items-center gap-2 mb-2">
            {list1.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode
                  value={value}
                  isActive={
                    pointer1 === index && currentComparison?.type === "compare"
                  }
                  isPointer={pointer1 === index}
                  listType={1}
                />
                {index < list1.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Pointer 1:{" "}
            {pointer1 < list1.length
              ? `Index ${pointer1} (value: ${list1[pointer1]})`
              : "End of list"}
          </div>
        </div>

        {/* List 2 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">List 2</h3>
          <div className="flex items-center gap-2 mb-2">
            {list2.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode
                  value={value}
                  isActive={
                    pointer2 === index && currentComparison?.type === "compare"
                  }
                  isPointer={pointer2 === index}
                  listType={2}
                />
                {index < list2.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Pointer 2:{" "}
            {pointer2 < list2.length
              ? `Index ${pointer2} (value: ${list2[pointer2]})`
              : "End of list"}
          </div>
        </div>

        {/* Merged List */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-primary">
            Merged List
          </h3>
          <div className="flex items-center gap-2 mb-2">
            {mergedList.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode
                  value={value}
                  isActive={index === mergedList.length - 1}
                  isPointer={false}
                  listType={0}
                />
                {index < mergedList.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
            {mergedList.length === 0 && (
              <div className="text-muted-foreground italic">
                Empty - merged elements will appear here
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Length: {mergedList.length}
          </div>
        </div>
      </div>

        {/* Current Step Info */}
        {currentComparison && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-accent mb-2">
              Current Operation
            </h3>
            {currentComparison.type === "compare" && (
              <div className="text-accent/80">
                Comparing {currentComparison.val1} vs {currentComparison.val2} →
                Adding{" "}
                {currentComparison.winner === 1
                  ? currentComparison.val1
                  : currentComparison.val2}
                from List {currentComparison.winner}
              </div>
            )}
            {currentComparison.type === "remaining" && (
              <div className="text-accent/80">
                List {currentComparison.list === 1 ? 2 : 1} is exhausted. Adding
                remaining element {currentComparison.value} from List{" "}
                {currentComparison.list}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={isPlaying ? handlePause : handlePlay}
            variant="default"
            size="default"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? "Pause" : isComplete ? "Restart" : "Play"}
          </Button>

          <Button
            onClick={executeStep}
            disabled={isComplete || isPlaying}
            variant="secondary"
            size="default"
          >
            <StepForward size={20} />
            Step
          </Button>

          <Button
            onClick={resetVisualization}
            variant="outline"
            size="default"
          >
            <RotateCcw size={20} />
            Reset
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <label className="text-sm font-medium text-foreground">
            Animation Speed:
          </label>
          <input
            type="range"
            min="200"
            max="2000"
            step="200"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">
            {speed}ms
          </span>
        </div>

        {isComplete && (
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <h3 className="text-primary font-semibold text-lg">
              Algorithm Complete! 🎉
            </h3>
            <p className="text-primary/80">
              Successfully merged {list1.length + list2.length} elements in{" "}
              {currentStep} steps.
            </p>
            <p className="text-primary/80 font-mono mt-2">
              Final result: [{mergedList.join(", ")}]
            </p>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MergeSortedListsVisualization;
