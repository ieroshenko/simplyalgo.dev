# Interactive Demo Registry

This folder contains interactive visualization components and a central registry to map problem IDs to their demo components.

## Files
- `registry.tsx`: Exposes `hasInteractiveDemo(problemId)` and `getDemoComponent(problemId)` used by the app to:
  - Show the "Interactive Demo" button only for supported problems.
  - Render the correct visualization inside the canvas modal.

## How to add a new interactive demo
1. Create your visualization component here, e.g. `MyNewVisualization.tsx`.
2. Import it and add a mapping in `registry.tsx`:

```ts
import MyNewVisualization from "@/components/visualizations/MyNewVisualization";

const registry = {
  ...,
  "my-problem-id": MyNewVisualization,
};
```

3. Ensure the `problemId` in the UI (e.g. `ProblemSolverNew` and `AIChat`) matches the key you added to the registry.

That's it — the "Interactive Demo" button will appear for that problem, and the correct component will be rendered in the modal.
