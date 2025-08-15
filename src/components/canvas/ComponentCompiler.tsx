import React, { useState, useEffect, useRef, ErrorInfo } from 'react';
import { transform } from '@babel/standalone';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Error Boundary Component
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Component Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {this.state.error?.message || 'Something went wrong while rendering the component'}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ComponentCompilerProps {
  code: string;
  onError?: (error: string) => void;
  className?: string;
}

export default function ComponentCompiler({ code, onError, className }: ComponentCompilerProps) {
  const [CompiledComponent, setCompiledComponent] = useState<React.ComponentType | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code.trim()) {
      setCompiledComponent(null);
      setCompileError(null);
      return;
    }

    compileComponent(code);
  }, [code]);

  const compileComponent = async (sourceCode: string) => {
    setIsCompiling(true);
    setCompileError(null);

    try {
      // Transform the component code with Babel
      const transformed = transform(sourceCode, {
        presets: ['react', 'typescript'],
        plugins: ['proposal-class-properties'],
      });

      if (!transformed.code) {
        throw new Error('Failed to transform component code');
      }

      // Create a function that returns the component
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'useRef',
        'useMemo',
        'useCallback',
        'motion',
        'AnimatePresence',
        'Button',
        'Card',
        'CardContent',
        'CardHeader',
        'CardTitle',
        'Input',
        'Label',
        'Slider',
        'Tabs',
        'TabsContent',
        'TabsList',
        'TabsTrigger',
        'AlertCircle',
        'Pause',
        'Play',
        'RotateCcw',
        'StepForward',
        'Shuffle',
        'CircleHelp',
        `
        ${transformed.code}
        
        // Return the default export or the last declared component
        if (typeof exports !== 'undefined' && exports.default) {
          return exports.default;
        }
        
        // Find the last function/class declaration that looks like a component
        const componentMatch = \`${sourceCode}\`.match(/(?:export\\s+default\\s+)?(?:function|class|const)\\s+(\\w+)/g);
        if (componentMatch) {
          const lastComponent = componentMatch[componentMatch.length - 1];
          const componentName = lastComponent.replace(/^(?:export\\s+default\\s+)?(?:function|class|const)\\s+/, '');
          return eval(componentName);
        }
        
        return null;
        `
      );

      // Import all the dependencies the component might need
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      const { motion, AnimatePresence } = await import('framer-motion');
      const { Button } = await import('@/components/ui/button');
      const { Card, CardContent, CardHeader, CardTitle } = await import('@/components/ui/card');
      const { Input } = await import('@/components/ui/input');
      const { Label } = await import('@/components/ui/label');
      const { Slider } = await import('@/components/ui/slider');
      const { Tabs, TabsContent, TabsList, TabsTrigger } = await import('@/components/ui/tabs');
      const { 
        AlertCircle, 
        Pause, 
        Play, 
        RotateCcw, 
        StepForward, 
        Shuffle, 
        CircleHelp 
      } = await import('lucide-react');

      // Execute the function to get the component
      const Component = componentFunction(
        React,
        useState,
        useEffect,
        useRef,
        useMemo,
        useCallback,
        motion,
        AnimatePresence,
        Button,
        Card,
        CardContent,
        CardHeader,
        CardTitle,
        Input,
        Label,
        Slider,
        Tabs,
        TabsContent,
        TabsList,
        TabsTrigger,
        AlertCircle,
        Pause,
        Play,
        RotateCcw,
        StepForward,
        Shuffle,
        CircleHelp
      );

      if (typeof Component !== 'function') {
        throw new Error('Compiled code did not return a valid React component');
      }

      setCompiledComponent(() => Component);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown compilation error';
      setCompileError(errorMessage);
      onError?.(errorMessage);
      console.error('Component compilation error:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleComponentError = (error: Error, errorInfo: ErrorInfo) => {
    const errorMessage = `Runtime Error: ${error.message}`;
    setCompileError(errorMessage);
    onError?.(errorMessage);
    console.error('Component runtime error:', error, errorInfo);
  };

  if (isCompiling) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Compiling component...</span>
      </div>
    );
  }

  if (compileError) {
    return (
      <Card className={`border-red-200 dark:border-red-800 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                Compilation Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 font-mono">
                {compileError}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!CompiledComponent) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-500 ${className}`}>
        No component to display
      </div>
    );
  }

  return (
    <div ref={mountRef} className={className}>
      <ComponentErrorBoundary onError={handleComponentError}>
        <CompiledComponent />
      </ComponentErrorBoundary>
    </div>
  );
}