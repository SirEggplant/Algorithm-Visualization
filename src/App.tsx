// src/App.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VisualizerEngine } from './core/engine';
import type { VisualizationState } from './core/types';
import HistoryLog, { type HistoryEntry } from './ui/HistoryLog';

// ─── Renderers ───
import { drawArray } from './renderers/arrayRenderer';
import { drawScatter, disposeScatterRenderer } from './renderers/scatterRenderer';

// ─── Registry ───
import {
  getAlgorithmIds,
  getDisplayName,
  getInfo,
  getGenerator,
  getDefaultAlgorithm,
  type Feature,
} from './algorithms/registry';

// --- Types ---
type PlayState = 'idle' | 'playing' | 'paused';
type SpeedOption = 'slow' | 'normal' | 'fast' | 'turbo';
type ArraySize = 25 | 50 | 100 | 200;

const SPEED_MAP: Record<SpeedOption, number> = {
  slow: 300,
  normal: 100,
  fast: 30,
  turbo: 5,
};

const features: Feature[] = ['sorting', 'optimization'];
const featureDisplayNames: Record<Feature, string> = {
  sorting: '🔵 Sorting',
  optimization: '🧠 Optimization',
};

function App() {
  // --- Refs for Canvases and Engines ---
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftEngineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const rightEngineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const replayIntervalRef = useRef<number | null>(null);

  // --- Core State ---
  const [array, setArray] = useState<number[]>([]);
  const [arraySize, setArraySize] = useState<ArraySize>(50);
  const [selectedFeature, setSelectedFeature] = useState<Feature>('sorting');
  const [leftAlgo, setLeftAlgo] = useState<string>(getDefaultAlgorithm('sorting'));
  const [rightAlgo, setRightAlgo] = useState<string>(getDefaultAlgorithm('sorting'));
  const [isSplit, setIsSplit] = useState(false);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [metadata, setMetadata] = useState<string>('');

  // --- Details Popup (Unsplit) ---
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // --- Details Popup (Split) ---
  const [showLeftDetails, setShowLeftDetails] = useState<boolean>(false);
  const [showRightDetails, setShowRightDetails] = useState<boolean>(false);

  // --- History State (Unsplit only) ---
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

  // --- Step Counters ---
  const leftStepCount = useRef<number>(0);
  const rightStepCount = useRef<number>(0);
  const leftTotalSteps = useRef<number>(0);
  const rightTotalSteps = useRef<number>(0);
  const leftFinished = useRef<boolean>(false);
  const rightFinished = useRef<boolean>(false);

  const prevFeatureRef = useRef<Feature>(selectedFeature);
  const prevAlgoRef = useRef<string>(leftAlgo);
  const isFirstRunRef = useRef(true);
  const isSizeChangeRef = useRef(true); // For size change detection

  // --- Core Functions ---

  const updateUIWithState = useCallback((state: VisualizationState, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    if (state.type === 'array') {
      drawArray(canvas, state);
    } else if (state.type === 'scatter') {
      drawScatter(canvas, state);
    }
  }, []);

  const updateMetadata = useCallback((state: VisualizationState) => {
    let metaText = '';
    const m = state.metadata;
    if (m.comparisons !== undefined) {
      metaText = `Comparisons: ${m.comparisons} | Swaps: ${m.swaps || 0}`;
    } else if (m.generation !== undefined) {
      metaText = `Search: ${m.generation} | Best Fitness: ${(m.fitness || 0).toFixed(4)}`;
    }
    if (m.action) {
      metaText = metaText ? `${metaText} | ${m.action}` : m.action;
    }
    setMetadata(metaText);
  }, []);

  // ─── Draw the current array on both canvases ───
  const drawCurrentArray = useCallback(() => {
    if (array.length === 0) return;
    const state: VisualizationState = {
      type: 'array',
      data: array,
      highlights: {},
      metadata: { action: 'Ready to sort!' },
    };
    if (leftCanvasRef.current) {
      drawArray(leftCanvasRef.current, state);
    }
    if (rightCanvasRef.current) {
      drawArray(rightCanvasRef.current, state);
    }
  }, [array]);

  // ─── Generate a fresh array ───
  const generateArray = useCallback(() => {
    if (selectedFeature !== 'sorting') return;
    const newArr = Array.from(
      { length: arraySize },
      () => Math.floor(Math.random() * 200) + 1
    );
    setArray(newArr);
    setPlayState('idle');
    setHistory([]);
    setCurrentHistoryIndex(-1);

    leftStepCount.current = 0;
    rightStepCount.current = 0;
    leftTotalSteps.current = 0;
    rightTotalSteps.current = 0;
    leftFinished.current = false;
    rightFinished.current = false;

    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    requestAnimationFrame(() => {
      const state: VisualizationState = {
        type: 'array',
        data: newArr,
        highlights: {},
        metadata: { action: 'Ready to sort!' },
      };
      if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
      if (rightCanvasRef.current) drawArray(rightCanvasRef.current, state);
    });
    setMetadata('Ready to sort!');
  }, [selectedFeature, arraySize]);

  // ─── Start Algorithm ───
  const startAlgorithm = useCallback(() => {
    if (array.length === 0) {
      generateArray();
      return;
    }

    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    leftStepCount.current = 0;
    rightStepCount.current = 0;
    leftTotalSteps.current = 0;
    rightTotalSteps.current = 0;
    leftFinished.current = false;
    rightFinished.current = false;
    setHistory([]);
    setCurrentHistoryIndex(-1);

    const checkBothFinished = () => {
      if (leftFinished.current && rightFinished.current) {
        // Both finished
      }
    };

    if (isSplit) {
      // ─── SPLIT MODE ───
      const leftGen = getGenerator(selectedFeature, leftAlgo, array);
      const rightGen = getGenerator(selectedFeature, rightAlgo, array);
      if (!leftGen || !rightGen) return;

      leftEngineRef.current.load(leftGen);
      leftEngineRef.current.onUpdate = (state: VisualizationState) => {
        leftStepCount.current += 1;
        if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
        if (state.metadata.action?.includes('complete')) {
          leftTotalSteps.current = leftStepCount.current;
          leftFinished.current = true;
          checkBothFinished();
        }
        setMetadata(`Left: ${getDisplayName(selectedFeature, leftAlgo)} | Steps: ${leftStepCount.current}`);
      };

      rightEngineRef.current.load(rightGen);
      rightEngineRef.current.onUpdate = (state: VisualizationState) => {
        rightStepCount.current += 1;
        if (rightCanvasRef.current) drawArray(rightCanvasRef.current, state);
        if (state.metadata.action?.includes('complete')) {
          rightTotalSteps.current = rightStepCount.current;
          rightFinished.current = true;
          checkBothFinished();
        }
        setMetadata(`Right: ${getDisplayName(selectedFeature, rightAlgo)} | Steps: ${rightStepCount.current}`);
      };

      setPlayState('playing');
      leftEngineRef.current.play(SPEED_MAP[speed]);
      rightEngineRef.current.play(SPEED_MAP[speed]);
    } else {
      // ─── UNSPLIT MODE ───
      const gen = getGenerator(selectedFeature, leftAlgo, array);
      if (!gen) return;

      leftEngineRef.current.load(gen);
      leftEngineRef.current.onUpdate = (state: VisualizationState) => {
        leftStepCount.current += 1;
        if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
        updateMetadata(state);

        setHistory((prev) => {
          const newEntry: HistoryEntry = {
            step: prev.length + 1,
            action: state.metadata.action || `Step ${prev.length + 1}`,
            state: JSON.parse(JSON.stringify(state)),
          };
          return [...prev, newEntry];
        });
        setCurrentHistoryIndex((prev) => prev + 1);

        if (state.metadata.action?.includes('complete')) {
          leftTotalSteps.current = leftStepCount.current;
          leftFinished.current = true;
          setPlayState('idle');
        }
      };

      setPlayState('playing');
      leftEngineRef.current.play(SPEED_MAP[speed]);
    }
  }, [array, selectedFeature, leftAlgo, rightAlgo, isSplit, speed, generateArray, updateMetadata]);

  // ─── Pause ───
  const pauseAlgorithm = useCallback(() => {
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('paused');
  }, []);

  // ─── Resume ───
  const resumeAlgorithm = useCallback(() => {
    setPlayState('playing');
    leftEngineRef.current.play(SPEED_MAP[speed]);
    if (isSplit) {
      rightEngineRef.current.play(SPEED_MAP[speed]);
    }
  }, [speed, isSplit]);

  // ─── Play/Pause/Resume ───
  const handlePlayButtonClick = useCallback(() => {
    if (playState === 'idle') {
      startAlgorithm();
    } else if (playState === 'playing') {
      pauseAlgorithm();
    } else if (playState === 'paused') {
      resumeAlgorithm();
    }
  }, [playState, startAlgorithm, pauseAlgorithm, resumeAlgorithm]);

  // ─── Next Button (Unsplit only) ───
  const stepForward = useCallback(() => {
    if (playState === 'playing') {
      leftEngineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      setPlayState('paused');
    }

    // 1. If we have history and we're not at the end, replay the next step from history
    if (history.length > 0 && currentHistoryIndex < history.length - 1) {
      const nextIndex = currentHistoryIndex + 1;
      const nextEntry = history[nextIndex];
      if (nextEntry) {
        updateUIWithState(nextEntry.state, leftCanvasRef.current);
        setCurrentHistoryIndex(nextIndex);
        // ✅ Update the step counter to match the replayed step
        leftStepCount.current = nextEntry.step;
        leftEngineRef.current.pause();
        setPlayState('paused');
        return;
      }
    }

    // 2. If we're at the latest step, generate a new step from the engine
    if (selectedFeature === 'sorting' && array.length === 0) return;

    // If no generator is loaded, create one
    if (!leftEngineRef.current['generator']) {
      const gen = getGenerator(selectedFeature, leftAlgo, array);
      if (!gen) return;

      // Reset counter for a fresh start
      leftStepCount.current = 0;

      leftEngineRef.current.load(gen);
      leftEngineRef.current.onUpdate = (state: VisualizationState) => {
        // Draw and update metadata
        if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
        updateMetadata(state);
        // Increment step counter
        leftStepCount.current += 1;
        // Push to history
        setHistory((prev) => {
          const newEntry: HistoryEntry = {
            step: prev.length + 1,
            action: state.metadata.action || `Step ${prev.length + 1}`,
            state: JSON.parse(JSON.stringify(state)),
          };
          return [...prev, newEntry];
        });
        setCurrentHistoryIndex((prev) => prev + 1);
      };
    }

    // Perform one step
    leftEngineRef.current.pause();
    setPlayState('paused');
    leftEngineRef.current.step();
  }, [currentHistoryIndex, history, playState, selectedFeature, leftAlgo, array, updateMetadata, updateUIWithState]);

  // ─── Revert to History Step ───
  const revertToStep = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= history.length) return;
      if (playState === 'playing') return;

      leftEngineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }

      const startIndex = currentHistoryIndex;
      if (startIndex >= targetIndex) {
        const entry = history[targetIndex];
        updateUIWithState(entry.state, leftCanvasRef.current);
        setCurrentHistoryIndex(targetIndex);
        setPlayState('paused');
        return;
      }

      let current = startIndex;
      setPlayState('paused');

      replayIntervalRef.current = window.setInterval(() => {
        current++;
        if (current > targetIndex) {
          clearInterval(replayIntervalRef.current!);
          replayIntervalRef.current = null;
          setPlayState('paused');
          return;
        }
        const entry = history[current];
        if (entry) {
          updateUIWithState(entry.state, leftCanvasRef.current);
          setCurrentHistoryIndex(current);
        }
      }, 20);
    },
    [history, currentHistoryIndex, playState, updateUIWithState]
  );

  // ─── Toggle Split ───
  const toggleSplit = useCallback(() => {
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('idle');
    setShowDetails(false);
    setShowLeftDetails(false);
    setShowRightDetails(false);

    // ─── Reset all step counters and flags ───
    leftStepCount.current = 0;
    rightStepCount.current = 0;
    leftTotalSteps.current = 0;
    rightTotalSteps.current = 0;
    leftFinished.current = false;
    rightFinished.current = false;
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setMetadata('');

    const newSplitState = !isSplit;
    setIsSplit(newSplitState);

    // ─── Clear the engine generators so Play starts fresh ───
    leftEngineRef.current['generator'] = null;
    rightEngineRef.current['generator'] = null;

    // ─── Redraw the current array on both canvases ───
    if (array.length > 0) {
      const state: VisualizationState = {
        type: 'array',
        data: array,
        highlights: {},
        metadata: { action: 'Ready to sort!' },
      };
      if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
      if (rightCanvasRef.current) drawArray(rightCanvasRef.current, state);
    }
  }, [isSplit, array]);

  // ─── Speed change handler ───
  useEffect(() => {
    if (playState === 'playing') {
      leftEngineRef.current.pause();
      if (isSplit) rightEngineRef.current.pause();
      leftEngineRef.current.play(SPEED_MAP[speed]);
      if (isSplit) rightEngineRef.current.play(SPEED_MAP[speed]);
    }
  }, [speed, isSplit, playState]);

  // ─── Force redraw on mount and when array changes ───
  useEffect(() => {
    if (array.length === 0) return;
    const state: VisualizationState = {
      type: 'array',
      data: array,
      highlights: {},
      metadata: { action: 'Ready to sort!' },
    };
    if (leftCanvasRef.current) {
      drawArray(leftCanvasRef.current, state);
    }
    if (isSplit && rightCanvasRef.current) {
      drawArray(rightCanvasRef.current, state);
    }
  }, [array, isSplit]);

  // ─── Reset when algorithm changes (except on initial mount) ───
  useEffect(() => {
    if (selectedFeature !== 'sorting') return;
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    // Pause everything
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    // Reset counters and state
    setPlayState('idle');
    leftStepCount.current = 0;
    rightStepCount.current = 0;
    leftTotalSteps.current = 0;
    rightTotalSteps.current = 0;
    leftFinished.current = false;
    rightFinished.current = false;
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setMetadata('');

    // Clear engine generators so Play starts fresh
    leftEngineRef.current['generator'] = null;
    rightEngineRef.current['generator'] = null;

    // Redraw the current array (keeping the same unsorted array)
    if (array.length > 0) {
      const state: VisualizationState = {
        type: 'array',
        data: array,
        highlights: {},
        metadata: { action: 'Ready to sort!' },
      };
      if (leftCanvasRef.current) drawArray(leftCanvasRef.current, state);
      if (isSplit && rightCanvasRef.current) drawArray(rightCanvasRef.current, state);
    }
  }, [leftAlgo, rightAlgo, selectedFeature, isSplit, array]);

  // ─── Regenerate array when size changes (except on initial mount) ───
  useEffect(() => {
    if (selectedFeature !== 'sorting') return;
    if (isSizeChangeRef.current) {
      isSizeChangeRef.current = false;
      return;
    }
    // Generate a new array with the new size
    generateArray();
  }, [arraySize, selectedFeature, generateArray]);

  // ─── Initialize ───
  useEffect(() => {
    generateArray();
    return () => {
      leftEngineRef.current.pause();
      rightEngineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      if (leftCanvasRef.current) disposeScatterRenderer(leftCanvasRef.current);
      if (rightCanvasRef.current) disposeScatterRenderer(rightCanvasRef.current);
    };
  }, []);

  // ─── Handle Feature / Algorithm switching (feature changes only) ───
  useEffect(() => {
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('idle');
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setShowDetails(false);
    setShowLeftDetails(false);
    setShowRightDetails(false);

    // Dispose 3D renderer when leaving optimization
    if (prevFeatureRef.current === 'optimization' && selectedFeature !== 'optimization') {
      if (leftCanvasRef.current) disposeScatterRenderer(leftCanvasRef.current);
      if (rightCanvasRef.current) disposeScatterRenderer(rightCanvasRef.current);
    }
    prevFeatureRef.current = selectedFeature;

    if (selectedFeature !== 'sorting') {
      setMetadata('');
      if (leftCanvasRef.current) {
        const ctx = leftCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, leftCanvasRef.current.width, leftCanvasRef.current.height);
          ctx.fillStyle = '#a4b0be';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            'Select "Play" to start searching!',
            leftCanvasRef.current.width / 2,
            leftCanvasRef.current.height / 2
          );
        }
      }
    }
  }, [selectedFeature]);

  // ─── Handle feature change ───
  const handleFeatureChange = (feature: Feature) => {
    setSelectedFeature(feature);
    const defaultAlgo = getDefaultAlgorithm(feature);
    setLeftAlgo(defaultAlgo);
    setRightAlgo(defaultAlgo);
    setShowDetails(false);
    setShowLeftDetails(false);
    setShowRightDetails(false);
    if (isSplit) setIsSplit(false);

    // If switching to sorting, generate a new array (already handled in useEffect)
    // But we reset the size change ref so that the size change effect doesn't trigger twice.
    if (feature === 'sorting') {
      isSizeChangeRef.current = true; // Allow the size change effect to run
      // The generateArray will be called by the feature change effect?
      // Actually we rely on the generateArray called from the feature switch effect? We'll call it manually here.
      // But we need to ensure it's called after state updates. We can use a timeout.
      // Instead, let's just call generateArray directly after setting state.
      // Since generateArray depends on selectedFeature and arraySize, and we are updating both, we can call it after a small delay.
      // Or we can rely on the useEffect that watches selectedFeature to generate array.
      // Actually I'll add a useEffect that watches selectedFeature and generates a new array when it becomes 'sorting' from a non-sorting state.
      // But we already have the handleFeatureChange setting the state, and we can use the existing feature change useEffect to generate.
      // I'll add a condition in the feature change useEffect to generateArray when selectedFeature is 'sorting' and previous wasn't.
    }
  };

  // ─── Generate array when switching to sorting feature ───
  useEffect(() => {
    if (selectedFeature === 'sorting' && prevFeatureRef.current !== selectedFeature) {
      // Only generate if we just switched from optimization to sorting
      generateArray();
    }
  }, [selectedFeature, generateArray]);

  // ─── Play button config ───
  const getPlayButtonConfig = () => {
    if (playState === 'idle') return { text: '▶ Play', bg: '#2ed573' };
    if (playState === 'playing') return { text: '⏹ Stop', bg: '#ff4757' };
    return { text: '▶ Resume', bg: '#ffa502' };
  };
  const playConfig = getPlayButtonConfig();

  const isSorting = selectedFeature === 'sorting';
  const availableSizes: ArraySize[] = [25, 50, 100, 200];
  const algorithmIds = getAlgorithmIds(selectedFeature);
  const currentAlgoInfo = getInfo(selectedFeature, leftAlgo);

  // ─── RENDER ───
  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        fontFamily: 'sans-serif',
        background: '#0a0e1a',
        color: '#e2e8f0',
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <h1 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '24px', flexShrink: 0 }}>
        ⚡ Algorithm Visualizer
      </h1>

      {/* ─── CONTROLS BAR ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '12px',
          alignItems: 'center',
          background: '#141b2d',
          padding: '10px 20px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        {/* Feature Dropdown */}
        <div>
          <label style={{ marginRight: '6px', fontWeight: 'bold', color: '#94a3b8', fontSize: '13px' }}>
            Feature:
          </label>
          <select
            value={selectedFeature}
            onChange={(e) => handleFeatureChange(e.target.value as Feature)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            disabled={playState === 'playing'}
          >
            {features.map((feature) => (
              <option key={feature} value={feature}>
                {featureDisplayNames[feature]}
              </option>
            ))}
          </select>
        </div>

        {/* New Array */}
        {isSorting && (
          <button
            onClick={generateArray}
            style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155', padding: '6px 14px' }}
            disabled={playState === 'playing'}
          >
            🔄 New
          </button>
        )}

        {/* Play / Stop / Resume */}
        <button
          onClick={handlePlayButtonClick}
          style={{
            ...btnStyle,
            background: playConfig.bg,
            width: '110px',
            fontWeight: 'bold',
            padding: '6px 16px',
          }}
        >
          {playConfig.text}
        </button>

        {/* Next Button (Unsplit only) */}
        {isSorting && !isSplit && (
          <button
            onClick={stepForward}
            style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155', padding: '6px 14px' }}
            disabled={playState === 'playing'}
          >
            ⏭ Next
          </button>
        )}

        {/* Array Size */}
        {isSorting && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Size:</span>
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => {
                  setArraySize(size);
                  // The useEffect will trigger generateArray, but we also reset the ref
                  // to allow the effect to run.
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: arraySize === size ? '#38bdf8' : 'transparent',
                  color: arraySize === size ? '#0a0e1a' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: arraySize === size ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: playState === 'playing' ? 0.5 : 1,
                }}
                disabled={playState === 'playing'}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Speed */}
        <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '6px' }}>
          {(['slow', 'normal', 'fast', 'turbo'] as SpeedOption[]).map((key) => (
            <button
              key={key}
              onClick={() => setSpeed(key)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: speed === key ? '#38bdf8' : 'transparent',
                color: speed === key ? '#0a0e1a' : '#94a3b8',
                fontSize: '11px',
                fontWeight: speed === key ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {key === 'slow' && '🐢'}
              {key === 'normal' && '🚶'}
              {key === 'fast' && '🏃'}
              {key === 'turbo' && '⚡'}
            </button>
          ))}
        </div>

        {/* Split Button */}
        {isSorting && (
          <button
            onClick={toggleSplit}
            style={{
              ...btnStyle,
              background: isSplit ? '#f87171' : '#1e293b',
              border: isSplit ? '1px solid #f87171' : '1px solid #334155',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 'bold',
              color: isSplit ? '#fff' : '#94a3b8',
            }}
            disabled={playState === 'playing'}
          >
            {isSplit ? '🔀 Unsplit' : '🔀 Split'}
          </button>
        )}

        {/* Color Legend */}
        {isSorting && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
            <span style={{ color: '#38bdf8' }}>🟦 Unsorted</span>
            <span style={{ color: '#facc15' }}>🟨 Comparing</span>
            <span style={{ color: '#f87171' }}>🟥 Swapping</span>
            <span style={{ color: '#4ade80' }}>🟩 Sorted</span>
          </div>
        )}
      </div>

      {/* ─── MAIN AREA ─── */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: '#141b2d',
          borderRadius: '10px',
          border: '1px solid #1e293b',
        }}
      >
        {!isSplit || !isSorting ? (
          // ─── UNSPLIT VIEW (Canvas + History) ───
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Left Canvas - Always visible */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                background: '#141b2d',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                overflow: 'hidden',
                marginRight: '12px',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: 'rgba(10, 14, 26, 0.85)',
                  borderBottom: '1px solid #1e293b',
                  flexShrink: 0,
                  zIndex: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                    Algorithm:
                  </span>
                  <select
                    value={leftAlgo}
                    onChange={(e) => {
                      setLeftAlgo(e.target.value);
                      setShowDetails(false);
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#0f172a',
                      color: playState === 'playing' ? '#64748b' : '#e2e8f0',
                      border: '1px solid #334155',
                      fontSize: '12px',
                      cursor: playState === 'playing' ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      opacity: playState === 'playing' ? 0.6 : 1,
                    }}
                    disabled={playState === 'playing'}
                  >
                    {algorithmIds.map((id) => (
                      <option key={id} value={id}>
                        {getDisplayName(selectedFeature, id)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{
                      background: showDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: showDetails ? '#38bdf8' : '#94a3b8',
                      padding: '2px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      lineHeight: '1.4',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#475569')}
                  >
                    📖 Details
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Steps: <span style={{ color: '#38bdf8' }}>{leftStepCount.current}</span>
                  {leftTotalSteps.current > 0 && (
                    <span style={{ color: '#4ade80' }}> / {leftTotalSteps.current}</span>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 0,
                }}
              >
                <canvas
                  ref={leftCanvasRef}
                  width={800}
                  height={400}
                  style={{
                    background: '#1a2340',
                    borderRadius: '6px',
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Details Popup (Unsplit) */}
              {showDetails && currentAlgoInfo && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50px',
                    left: '20px',
                    zIndex: 20,
                    padding: '16px 18px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    width: '340px',
                    maxWidth: '340px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.9)',
                    pointerEvents: 'auto',
                  }}
                >
                  <button
                    onClick={() => setShowDetails(false)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: '1',
                    }}
                  >
                    ✕
                  </button>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '21px', fontWeight: 'bold' }}>
                    {currentAlgoInfo.name}
                  </h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#94a3b8', lineHeight: '1.5' }}>
                    {currentAlgoInfo.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '15px',
                      color: '#64748b',
                      borderTop: '1px solid #1e293b',
                      paddingTop: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span>⚡ Best: {currentAlgoInfo.bestCase}</span>
                    <span>📊 Avg: {currentAlgoInfo.avgCase}</span>
                    <span>🐌 Worst: {currentAlgoInfo.worstCase}</span>
                    <span>💾 Space: {currentAlgoInfo.spaceComplexity}</span>
                  </div>
                </div>
              )}
            </div>

            {/* History Log */}
            <div style={{ flex: '0 0 320px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <HistoryLog
                history={history}
                currentIndex={currentHistoryIndex}
                onSelect={revertToStep}
                isPlaying={playState === 'playing'}
              />
            </div>
          </div>
        ) : (
          // ─── SPLIT VIEW: Two Canvases (No History) ───
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flex: 1,
              height: '100%',
              minHeight: 0,
            }}
          >
            {/* ─── LEFT PANEL ─── */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                background: '#141b2d',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: 'rgba(10, 14, 26, 0.85)',
                  borderBottom: '1px solid #1e293b',
                  flexShrink: 0,
                  zIndex: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Left:</span>
                  <select
                    value={leftAlgo}
                    onChange={(e) => {
                      setLeftAlgo(e.target.value);
                      setShowLeftDetails(false);
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#0f172a',
                      color: playState === 'playing' ? '#64748b' : '#e2e8f0',
                      border: '1px solid #334155',
                      fontSize: '12px',
                      cursor: playState === 'playing' ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      opacity: playState === 'playing' ? 0.6 : 1,
                    }}
                    disabled={playState === 'playing'}
                  >
                    {algorithmIds.map((id) => (
                      <option key={id} value={id}>
                        {getDisplayName(selectedFeature, id)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowLeftDetails(!showLeftDetails)}
                    style={{
                      background: showLeftDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: showLeftDetails ? '#38bdf8' : '#94a3b8',
                      padding: '2px 6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      lineHeight: '1.4',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#475569')}
                  >
                    📖 Details
                  </button>
                  {leftFinished.current && (
                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>✅</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Steps: <span style={{ color: '#38bdf8' }}>{leftStepCount.current}</span>
                  {leftTotalSteps.current > 0 && (
                    <span style={{ color: '#4ade80' }}> / {leftTotalSteps.current}</span>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 0,
                }}
              >
                <canvas
                  ref={leftCanvasRef}
                  width={800}
                  height={400}
                  style={{
                    background: '#1a2340',
                    borderRadius: '6px',
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Left Details Popup */}
              {showLeftDetails && (() => {
                const info = getInfo(selectedFeature, leftAlgo);
                if (!info) return null;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '10px',
                      zIndex: 20,
                      padding: '14px 16px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      width: '300px',
                      maxWidth: '300px',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.9)',
                      pointerEvents: 'auto',
                    }}
                  >
                    <button
                      onClick={() => setShowLeftDetails(false)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      ✕
                    </button>
                    <h4 style={{ margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' }}>
                      {info.name}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#94a3b8', lineHeight: '1.4' }}>
                      {info.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#64748b',
                        borderTop: '1px solid #1e293b',
                        paddingTop: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <span>⚡ Best: {info.bestCase}</span>
                      <span>📊 Avg: {info.avgCase}</span>
                      <span>🐌 Worst: {info.worstCase}</span>
                      <span>💾 Space: {info.spaceComplexity}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                background: '#141b2d',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: 'rgba(10, 14, 26, 0.85)',
                  borderBottom: '1px solid #1e293b',
                  flexShrink: 0,
                  zIndex: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Right:</span>
                  <select
                    value={rightAlgo}
                    onChange={(e) => {
                      setRightAlgo(e.target.value);
                      setShowRightDetails(false);
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#0f172a',
                      color: playState === 'playing' ? '#64748b' : '#e2e8f0',
                      border: '1px solid #334155',
                      fontSize: '12px',
                      cursor: playState === 'playing' ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      opacity: playState === 'playing' ? 0.6 : 1,
                    }}
                    disabled={playState === 'playing'}
                  >
                    {algorithmIds.map((id) => (
                      <option key={id} value={id}>
                        {getDisplayName(selectedFeature, id)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowRightDetails(!showRightDetails)}
                    style={{
                      background: showRightDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: showRightDetails ? '#38bdf8' : '#94a3b8',
                      padding: '2px 6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      lineHeight: '1.4',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#475569')}
                  >
                    📖 Details
                  </button>
                  {rightFinished.current && (
                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>✅</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Steps: <span style={{ color: '#38bdf8' }}>{rightStepCount.current}</span>
                  {rightTotalSteps.current > 0 && (
                    <span style={{ color: '#4ade80' }}> / {rightTotalSteps.current}</span>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 0,
                }}
              >
                <canvas
                  ref={rightCanvasRef}
                  width={800}
                  height={400}
                  style={{
                    background: '#1a2340',
                    borderRadius: '6px',
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Right Details Popup */}
              {showRightDetails && (() => {
                const info = getInfo(selectedFeature, rightAlgo);
                if (!info) return null;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '10px',
                      zIndex: 20,
                      padding: '14px 16px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      width: '300px',
                      maxWidth: '300px',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.9)',
                      pointerEvents: 'auto',
                    }}
                  >
                    <button
                      onClick={() => setShowRightDetails(false)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      ✕
                    </button>
                    <h4 style={{ margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' }}>
                      {info.name}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#94a3b8', lineHeight: '1.4' }}>
                      {info.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#64748b',
                        borderTop: '1px solid #1e293b',
                        paddingTop: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <span>⚡ Best: {info.bestCase}</span>
                      <span>📊 Avg: {info.avgCase}</span>
                      <span>🐌 Worst: {info.worstCase}</span>
                      <span>💾 Space: {info.spaceComplexity}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '13px',
  transition: 'all 0.2s ease',
  background: '#3742fa',
};

export default App;