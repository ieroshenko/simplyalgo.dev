/**
 * Fallback visualization component for algorithm demonstrations
 * This is used when GPT-generated visualization fails or is unavailable
 */
export const FALLBACK_VISUALIZATION_CODE = `
const AlgorithmVisualizer = () => {
  const [values, setValues] = React.useState([64, 34, 25, 12, 22, 11, 90]);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(500);

  const sortSteps = useMemo(() => {
    const arr = [...values];
    const steps = [{ array: [...arr], comparing: [], swapping: [] }];
    
    // Bubble sort with step tracking
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        steps.push({ array: [...arr], comparing: [j, j + 1], swapping: [] });
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          steps.push({ array: [...arr], comparing: [], swapping: [j, j + 1] });
        }
      }
    }
    return steps;
  }, [values]);

  useEffect(() => {
    let timer;
    if (isPlaying && currentStep < sortSteps.length - 1) {
      timer = setTimeout(() => setCurrentStep(s => s + 1), speed);
    } else if (currentStep >= sortSteps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speed, sortSteps.length]);

  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const randomize = () => {
    const newValues = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 1);
    setValues(newValues);
    reset();
  };

  const currentStepData = sortSteps[currentStep] || sortSteps[0];

  return React.createElement('div', {
    className: "w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8"
  },
    React.createElement('div', {
      className: "max-w-4xl mx-auto space-y-6"
    },
      React.createElement(Card, {},
        React.createElement(CardHeader, {},
          React.createElement(CardTitle, {
            className: "flex items-center gap-2"
          },
            React.createElement(CircleHelp, { className: "h-5 w-5" }),
            "Bubble Sort Visualizer"
          )
        ),
        React.createElement(CardContent, {
          className: "space-y-6"
        },
          // Array Visualization
          React.createElement('div', {
            className: "flex items-end justify-center gap-2 h-64 p-4"
          },
            React.createElement(AnimatePresence, {},
              currentStepData.array.map((value, index) =>
                React.createElement(motion.div, {
                  key: \`\${index}-\${value}\`,
                  layout: true,
                  initial: { scale: 0.8, opacity: 0 },
                  animate: { 
                    scale: 1, 
                    opacity: 1,
                    backgroundColor: currentStepData.comparing.includes(index) 
                      ? '#fbbf24' 
                      : currentStepData.swapping.includes(index) 
                      ? '#ef4444' 
                      : '#3b82f6'
                  },
                  exit: { scale: 0.8, opacity: 0 },
                  className: "flex flex-col items-center"
                },
                  React.createElement('div', {
                    className: "text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  }, value),
                  React.createElement(motion.div, {
                    className: "w-12 rounded-t-lg",
                    style: { 
                      height: \`\${(value / Math.max(...values)) * 200}px\`,
                      backgroundColor: currentStepData.comparing.includes(index) 
                        ? '#fbbf24' 
                        : currentStepData.swapping.includes(index) 
                        ? '#ef4444' 
                        : '#3b82f6'
                    },
                    animate: {
                      scale: currentStepData.comparing.includes(index) || currentStepData.swapping.includes(index) ? 1.1 : 1
                    }
                  })
                )
              )
            )
          ),
          
          // Controls
          React.createElement('div', {
            className: "flex items-center justify-between"
          },
            React.createElement('div', {
              className: "flex items-center gap-2"
            },
              React.createElement(Button, {
                onClick: () => setCurrentStep(Math.max(0, currentStep - 1)),
                disabled: currentStep === 0
              }, "Previous"),
              React.createElement(Button, {
                onClick: () => setIsPlaying(!isPlaying),
                disabled: currentStep >= sortSteps.length - 1
              },
                isPlaying ? React.createElement(Pause, { className: "h-4 w-4" }) : React.createElement(Play, { className: "h-4 w-4" }),
                isPlaying ? 'Pause' : 'Play'
              ),
              React.createElement(Button, {
                onClick: () => setCurrentStep(Math.min(sortSteps.length - 1, currentStep + 1)),
                disabled: currentStep >= sortSteps.length - 1
              }, "Next")
            ),
            
            React.createElement('div', {
              className: "flex items-center gap-2"
            },
              React.createElement(Button, {
                onClick: reset,
                variant: "outline"
              },
                React.createElement(RotateCcw, { className: "h-4 w-4 mr-2" }),
                "Reset"
              ),
              React.createElement(Button, {
                onClick: randomize,
                variant: "outline"
              },
                React.createElement(Shuffle, { className: "h-4 w-4 mr-2" }),
                "Randomize"
              )
            )
          ),

          // Speed Control
          React.createElement('div', {
            className: "flex items-center gap-4"
          },
            React.createElement(Label, {}, "Speed"),
            React.createElement(Slider, {
              value: [speed],
              onValueChange: (value) => setSpeed(value[0]),
              max: 1000,
              min: 100,
              step: 100,
              className: "flex-1"
            }),
            React.createElement('span', {
              className: "text-sm text-gray-600 dark:text-gray-400 w-16"
            }, \`\${speed}ms\`)
          ),

          // Step Info
          React.createElement('div', {
            className: "text-center text-sm text-gray-600 dark:text-gray-400"
          },
            \`Step \${currentStep + 1} of \${sortSteps.length}\`,
            currentStepData.comparing.length > 0 && React.createElement('span', {
              className: "ml-2"
            }, \`Comparing positions \${currentStepData.comparing.join(' and ')}\`),
            currentStepData.swapping.length > 0 && React.createElement('span', {
              className: "ml-2"
            }, \`Swapping positions \${currentStepData.swapping.join(' and ')}\`)
          )
        )
      )
    )
  );
}

return AlgorithmVisualizer;`;

export const FALLBACK_VISUALIZATION_TITLE = "Algorithm Visualizer (Fallback)";

/**
 * Fallback visualization configuration
 * Contains both the code and title for the fallback component
 */
export const fallbackVisualization = {
  code: FALLBACK_VISUALIZATION_CODE,
  title: FALLBACK_VISUALIZATION_TITLE,
} as const;
