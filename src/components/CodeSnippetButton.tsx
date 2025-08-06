import { Button } from '@/components/ui/button';
import { CodeSnippet } from '@/types';
import { Code, Plus } from 'lucide-react';
import { useState } from 'react';

interface CodeSnippetButtonProps {
  snippet: CodeSnippet;
  onInsert: (snippet: CodeSnippet) => void;
  className?: string;
}

const CodeSnippetButton = ({ snippet, onInsert, className = '' }: CodeSnippetButtonProps) => {
  const [isInserting, setIsInserting] = useState(false);

  const handleInsert = async () => {
    if (isInserting) return;
    
    setIsInserting(true);
    try {
      await onInsert(snippet);
    } catch (error) {
      console.error('Failed to insert code snippet:', error);
    } finally {
      setTimeout(() => {
        setIsInserting(false);
      }, 1000); // Brief delay to show success state
    }
  };

  const getInsertionDescription = () => {
    if (snippet.insertionHint?.description) {
      return snippet.insertionHint.description;
    }
    
    switch (snippet.insertionHint?.type) {
      case 'import':
        return 'Add import at top of file';
      case 'variable':
        return 'Add variable declaration';
      case 'function':
        return 'Add function definition';
      case 'statement':
        return 'Add code statement';
      case 'class':
        return 'Add class definition';
      default:
        return 'Add to editor';
    }
  };

  if (!snippet.isValidated) {
    return null; // Only show button for validated snippets
  }

  return (
    <Button
      onClick={handleInsert}
      disabled={isInserting}
      size="sm"
      variant="secondary"
      className={`ml-2 h-7 px-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 ${className}`}
      title={getInsertionDescription()}
    >
      {isInserting ? (
        <>
          <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin mr-1" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="w-3 h-3 mr-1" />
          Add to Editor
        </>
      )}
    </Button>
  );
};

export default CodeSnippetButton;