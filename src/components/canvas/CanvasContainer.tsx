import React, { useState } from 'react';
import CanvasModal from './CanvasModal';
import MergeSortedListsVisualization from '@/components/visualizations/MergeSortedListsVisualization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Eye, Download } from 'lucide-react';

interface CanvasContainerProps {
  initialCode?: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CanvasContainer({ 
  initialCode = '', 
  title = "Interactive Component",
  isOpen,
  onClose 
}: CanvasContainerProps) {
  return (
    <CanvasModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      {/* Direct component rendering - no compilation needed */}
      <div className="h-full overflow-auto">
        <MergeSortedListsVisualization />
      </div>
    </CanvasModal>
  );
}