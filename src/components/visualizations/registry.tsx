import React from "react";
import BucketSortVisualization from "@/components/visualizations/BucketSortVisualization";
import MergeSortedListsVisualization from "@/components/visualizations/MergeSortedListsVisualization";

export type DemoComponent = React.ComponentType<unknown>;

// Map problem IDs to their interactive demo components
const registry: Record<string, DemoComponent> = {
  // K Most Frequent Elements (Bucket Sort approach)
  "top-k-frequent-elements": BucketSortVisualization,
  // Merge Two Sorted Linked Lists
  "merge-two-sorted-lists": MergeSortedListsVisualization,
};

export function hasInteractiveDemo(problemId?: string): boolean {
  if (!problemId) return false;
  return Boolean(registry[problemId]);
}

export function getDemoComponent(problemId?: string): DemoComponent | null {
  if (!problemId) return null;
  return registry[problemId] ?? null;
}
