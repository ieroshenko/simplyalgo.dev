import { Badge } from '@/components/ui/badge';
import { Check, Clock, X } from 'lucide-react';
import type { TestResult } from '@/types';

type ProblemSolverTestResultsPanelProps = {
  testResults: TestResult[];
  activeTestCase: number;
  setActiveTestCase: (index: number) => void;
  renderValue: (value: unknown) => string;
};

export const ProblemSolverTestResultsPanel = ({
  testResults,
  activeTestCase,
  setActiveTestCase,
  renderValue,
}: ProblemSolverTestResultsPanelProps) => {
  if (testResults.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
        <div className="font-mono text-sm text-muted-foreground">Click "Run" to test your code...</div>
      </div>
    );
  }

  const active = testResults[activeTestCase];

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="px-4 pt-4 pb-2 min-w-0">
        <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
        {/* Horizontal scroll when there are many test cases */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 mb-3 w-max min-w-full">
            {testResults.map((result, index) => {
              let buttonClass =
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium transition-all rounded border-2 ';
              if (activeTestCase === index) {
                buttonClass += result.passed
                  ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600'
                  : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600';
              } else {
                buttonClass += result.passed
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-500 dark:border-green-800 dark:hover:bg-green-900/20'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-500 dark:border-red-800 dark:hover:bg-red-900/20';
              }
              return (
                <button key={index} onClick={() => setActiveTestCase(index)} className={buttonClass}>
                  {result.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Case {index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {active && (
          <div
            className={`p-4 rounded-lg border-2 ${
              active.passed
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {active.passed ? (
                  <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
                ) : (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Test Case {activeTestCase + 1}
                </span>
                <Badge
                  className={`text-xs font-semibold px-3 py-1 ${
                    active.passed
                      ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600'
                      : 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600'
                  }`}
                >
                  {active.passed ? '✅ PASSED' : '❌ FAILED'}
                </Badge>
              </div>
              {active.time && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{active.time}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Input:</div>
                <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
                  {renderValue(active.input)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    Expected Output:
                  </div>
                  <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
                    {renderValue(active.expected)}
                  </pre>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Your Output:</div>
                  <pre
                    className={`text-sm font-mono whitespace-pre overflow-x-auto ${
                      active.passed
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {renderValue(active.actual) || 'No output'}
                  </pre>
                </div>
              </div>

              {active.stderr && (
                <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Error:</div>
                  <pre className="text-sm font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                    {active.stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
