import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import type { FlowGraph } from '@/types';

type Props = {
  graph: FlowGraph;
  className?: string;
  caption?: string;
  height?: number | string;
};

export default function FlowCanvas({ graph, className, caption, height = '20rem' }: Props) {
  const nodes = useMemo(() => Array.isArray(graph?.nodes) ? graph.nodes : [], [graph]);
  const edges = useMemo(() => Array.isArray(graph?.edges) ? graph.edges : [], [graph]);

  return (
    <figure className={className}>
      <div className="rounded-lg overflow-hidden border border-accent/30 bg-background" style={{ height }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      {caption ? (
        <figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}


