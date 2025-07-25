import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Upload, Settings } from 'lucide-react';
import { useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  initialCode: string;
  onRun: (code: string) => void;
  onSubmit: (code: string) => void;
}

const CodeEditor = ({ initialCode, onRun, onSubmit }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    // Simulate code execution
    setTimeout(() => {
      setOutput('Test Case 1: ✅ Passed\nTest Case 2: ✅ Passed\nTest Case 3: ✅ Passed\n\nAll test cases passed!');
      setIsRunning(false);
    }, 1500);
    onRun(code);
  };

  const handleSubmit = () => {
    onSubmit(code);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/50">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">Python</span>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button 
            size="sm"
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Upload className="w-4 h-4 mr-1" />
            Submit
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            lineHeight: 1.5,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
        />
      </div>

      {/* Console Output */}
      <Card className="m-3 p-4 min-h-[120px] bg-secondary/30">
        <div className="text-sm font-medium text-foreground mb-2">Console</div>
        <div className="font-mono text-sm text-muted-foreground whitespace-pre-line">
          {output || 'Click "Run" to test your code...'}
        </div>
      </Card>
    </div>
  );
};

export default CodeEditor;