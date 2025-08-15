import React, { useState } from 'react';
import CanvasModal from './CanvasModal';
import ComponentCompiler from './ComponentCompiler';
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
  const [code, setCode] = useState(initialCode);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Update code when initialCode changes
  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  return (
    <CanvasModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      {/* No tabs - just show the preview directly */}
      <div className="h-full overflow-auto">
        {compileError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400 font-mono">
              {compileError}
            </p>
          </div>
        )}
        <ComponentCompiler 
          code={code} 
          onError={setCompileError}
          className="h-full"
        />
      </div>
    </CanvasModal>
  );
}