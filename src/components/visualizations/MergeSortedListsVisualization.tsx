import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, StepForward } from 'lucide-react';

const MergeSortedListsVisualization = () => {
  const [list1, setList1] = useState([1, 2, 4]);
  const [list2, setList2] = useState([1, 3, 4]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1000);
  
  // Algorithm state
  const [pointer1, setPointer1] = useState(0);
  const [pointer2, setPointer2] = useState(0);
  const [mergedList, setMergedList] = useState([]);
  const [currentComparison, setCurrentComparison] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    { action: 'init', description: 'Initialize two pointers at the start of each list' },
    { action: 'compare', description: 'Compare current elements and add smaller one to result' },
    { action: 'advance', description: 'Move pointer of the selected list forward' },
    { action: 'complete', description: 'Add remaining elements from non-empty list' }
  ];

  const resetVisualization = () => {
    setPointer1(0);
    setPointer2(0);
    setMergedList([]);
    setCurrentComparison(null);
    setIsComplete(false);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const executeStep = () => {
    if (isComplete) return;

    if (pointer1 >= list1.length && pointer2 >= list2.length) {
      setIsComplete(true);
      setIsPlaying(false);
      setCurrentComparison(null);
      return;
    }

    if (pointer1 >= list1.length) {
      // Add remaining from list2
      setMergedList(prev => [...prev, list2[pointer2]]);
      setPointer2(prev => prev + 1);
      setCurrentComparison({ type: 'remaining', list: 2, value: list2[pointer2] });
    } else if (pointer2 >= list2.length) {
      // Add remaining from list1
      setMergedList(prev => [...prev, list1[pointer1]]);
      setPointer1(prev => prev + 1);
      setCurrentComparison({ type: 'remaining', list: 1, value: list1[pointer1] });
    } else {
      // Compare and add smaller
      const val1 = list1[pointer1];
      const val2 = list2[pointer2];
      
      if (val1 <= val2) {
        setMergedList(prev => [...prev, val1]);
        setPointer1(prev => prev + 1);
        setCurrentComparison({ type: 'compare', winner: 1, val1, val2 });
      } else {
        setMergedList(prev => [...prev, val2]);
        setPointer2(prev => prev + 1);
        setCurrentComparison({ type: 'compare', winner: 2, val1, val2 });
      }
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handlePlay = () => {
    if (isComplete) {
      resetVisualization();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleInputChange = (listType, value) => {
    const numbers = value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (listType === 1) {
      setList1(numbers.sort((a, b) => a - b));
    } else {
      setList2(numbers.sort((a, b) => a - b));
    }
    resetVisualization();
  };

  useEffect(() => {
    let interval;
    if (isPlaying && !isComplete) {
      interval = setInterval(executeStep, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isComplete, pointer1, pointer2, speed]);

  const ListNode = ({ value, isActive, isPointer, listType }) => (
    <div className={`
      flex items-center justify-center w-12 h-12 rounded-lg border-2 font-mono font-bold
      ${isActive ? 'bg-blue-500 text-white border-blue-600 scale-110 shadow-lg' : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'}
      ${isPointer ? `border-${listType === 1 ? 'green' : 'purple'}-500 border-4` : ''}
      transition-all duration-300
    `}>
      {value}
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center w-8 h-8">
      <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-400"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
        Merge Two Sorted Linked Lists
      </h1>
      
      {/* Algorithm Explanation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Algorithm Overview</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Use two pointers to traverse both lists simultaneously. Compare current elements and add the smaller one to the result list.
        </p>
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm">
          <div className="text-gray-800 dark:text-gray-200">Time Complexity: O(m + n) where m, n are list lengths</div>
          <div className="text-gray-800 dark:text-gray-200">Space Complexity: O(1) for iterative, O(m + n) for recursive</div>
        </div>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">List 1 (comma-separated)</label>
          <input
            type="text"
            value={list1.join(', ')}
            onChange={(e) => handleInputChange(1, e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            placeholder="1, 2, 4"
          />
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">List 2 (comma-separated)</label>
          <input
            type="text"
            value={list2.join(', ')}
            onChange={(e) => handleInputChange(2, e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            placeholder="1, 3, 4"
          />
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        {/* List 1 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-green-600">List 1</h3>
          <div className="flex items-center gap-2 mb-2">
            {list1.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode 
                  value={value} 
                  isActive={pointer1 === index && currentComparison?.type === 'compare'}
                  isPointer={pointer1 === index}
                  listType={1}
                />
                {index < list1.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pointer 1: {pointer1 < list1.length ? `Index ${pointer1} (value: ${list1[pointer1]})` : 'End of list'}
          </div>
        </div>

        {/* List 2 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-600">List 2</h3>
          <div className="flex items-center gap-2 mb-2">
            {list2.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode 
                  value={value} 
                  isActive={pointer2 === index && currentComparison?.type === 'compare'}
                  isPointer={pointer2 === index}
                  listType={2}
                />
                {index < list2.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pointer 2: {pointer2 < list2.length ? `Index ${pointer2} (value: ${list2[pointer2]})` : 'End of list'}
          </div>
        </div>

        {/* Merged List */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-600">Merged List</h3>
          <div className="flex items-center gap-2 mb-2">
            {mergedList.map((value, index) => (
              <React.Fragment key={index}>
                <ListNode 
                  value={value} 
                  isActive={index === mergedList.length - 1}
                  listType={0}
                />
                {index < mergedList.length - 1 && <Arrow />}
              </React.Fragment>
            ))}
            {mergedList.length === 0 && (
              <div className="text-gray-400 italic">Empty - merged elements will appear here</div>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Length: {mergedList.length}
          </div>
        </div>
      </div>

      {/* Current Step Info */}
      {currentComparison && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Current Operation</h3>
          {currentComparison.type === 'compare' && (
            <div className="text-yellow-700 dark:text-yellow-300">
              Comparing {currentComparison.val1} vs {currentComparison.val2} → 
              Adding {currentComparison.winner === 1 ? currentComparison.val1 : currentComparison.val2} 
              from List {currentComparison.winner}
            </div>
          )}
          {currentComparison.type === 'remaining' && (
            <div className="text-yellow-700 dark:text-yellow-300">
              List {currentComparison.list === 1 ? 2 : 1} is exhausted. 
              Adding remaining element {currentComparison.value} from List {currentComparison.list}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          {isPlaying ? 'Pause' : (isComplete ? 'Restart' : 'Play')}
        </button>
        
        <button
          onClick={executeStep}
          disabled={isComplete || isPlaying}
          className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <StepForward size={20} />
          Step
        </button>
        
        <button
          onClick={resetVisualization}
          className="flex items-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Animation Speed:</label>
        <input
          type="range"
          min="200"
          max="2000"
          step="200"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          className="w-32"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">{speed}ms</span>
      </div>


      {isComplete && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
          <h3 className="text-green-800 dark:text-green-200 font-semibold text-lg">Algorithm Complete! 🎉</h3>
          <p className="text-green-700 dark:text-green-300">
            Successfully merged {list1.length + list2.length} elements in {currentStep} steps.
          </p>
          <p className="text-green-700 dark:text-green-300 font-mono mt-2">
            Final result: [{mergedList.join(', ')}]
          </p>
        </div>
      )}
    </div>
  );
};

export default MergeSortedListsVisualization;