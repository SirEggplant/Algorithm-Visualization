// src/components/optimization/OptimizationFeature.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VisualizerEngine } from '../../core/engine';
import type { VisualizationState } from '../../core/types';
import { drawScatter, disposeScatterRenderer } from './scatterRenderer';
import {
  getAlgorithmIds,
  getDisplayName,
  getInfo,
  getGenerator,
  getDefaultAlgorithm,
} from '../../algorithms/registry';

type PlayState = 'idle' | 'playing' | 'paused';
type SpeedOption = 'slow' | 'normal' | 'fast' | 'turbo';

const SPEED_MAP: Record<SpeedOption, number> = {
  slow: 300,
  normal: 100,
  fast: 30,
  turbo: 5,
};

interface OptimizationFeatureProps {
  isSplit: boolean;
}

const OptimizationFeature: React.FC<OptimizationFeatureProps> = ({ isSplit }) => {
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftEngineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const rightEngineRef = useRef<VisualizerEngine>(new VisualizerEngine());

  const [leftAlgo, setLeftAlgo] = useState<string>(getDefaultAlgorithm('optimization'));
  const [rightAlgo, setRightAlgo] = useState<string>(getDefaultAlgorithm('optimization'));
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [metadata, setMetadata] = useState<string>('');
  const [showLeftDetails, setShowLeftDetails] = useState<boolean>(false);
  const [showRightDetails, setShowRightDetails] = useState<boolean>(false);

  const leftStepCount = useRef<number>(0);
  const rightStepCount = useRef<number>(0);
  const leftFinished = useRef<boolean>(false);
  const rightFinished = useRef<boolean>(false);

  const algorithmIds = getAlgorithmIds('optimization');

  const updateMetadata = useCallback((state: VisualizationState) => {
    let metaText = '';
    const m = state.metadata;
    if (m.generation !== undefined) {
      metaText = `Generation: ${m.generation} | Best Fitness: ${(m.fitness || 0).toFixed(4)}`;
    }
    if (m.action) {
      metaText = metaText ? `${metaText} | ${m.action}` : m.action;
    }
    setMetadata(metaText);
  }, []);

  const startAlgorithm = useCallback(() => {
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();

    leftStepCount.current = 0;
    rightStepCount.current = 0;
    leftFinished.current = false;
    rightFinished.current = false;

    const checkBothFinished = () => {
      if (leftFinished.current && rightFinished.current) {
        setPlayState('idle');
        setMetadata('Both algorithms finished! Press Play to run again.');
      }
    };

    if (isSplit) {
      const leftGen = getGenerator('optimization', leftAlgo, []);
      const rightGen = getGenerator('optimization', rightAlgo, []);
      if (!leftGen || !rightGen) return;

      leftEngineRef.current.load(leftGen);
      leftEngineRef.current.onUpdate = (state: VisualizationState) => {
        leftStepCount.current += 1;
        if (leftCanvasRef.current) drawScatter(leftCanvasRef.current, state);
        updateMetadata(state);
        if (state.metadata.action?.includes('complete')) {
          leftFinished.current = true;
          checkBothFinished();
        }
      };

      rightEngineRef.current.load(rightGen);
      rightEngineRef.current.onUpdate = (state: VisualizationState) => {
        rightStepCount.current += 1;
        if (rightCanvasRef.current) drawScatter(rightCanvasRef.current, state);
        updateMetadata(state);
        if (state.metadata.action?.includes('complete')) {
          rightFinished.current = true;
          checkBothFinished();
        }
      };

      setPlayState('playing');
      leftEngineRef.current.play(SPEED_MAP[speed]);
      rightEngineRef.current.play(SPEED_MAP[speed]);
    } else {
      const gen = getGenerator('optimization', leftAlgo, []);
      if (!gen) return;

      leftEngineRef.current.load(gen);
      leftEngineRef.current.onUpdate = (state: VisualizationState) => {
        leftStepCount.current += 1;
        if (leftCanvasRef.current) drawScatter(leftCanvasRef.current, state);
        updateMetadata(state);
        if (state.metadata.action?.includes('complete')) {
          leftFinished.current = true;
          setPlayState('idle');
          setMetadata('Algorithm finished! Press Play to run again.');
        }
      };

      setPlayState('playing');
      leftEngineRef.current.play(SPEED_MAP[speed]);
    }
  }, [leftAlgo, rightAlgo, isSplit, speed]);

  const pauseAlgorithm = useCallback(() => {
    leftEngineRef.current.pause();
    rightEngineRef.current.pause();
    setPlayState('paused');
  }, []);

  const resumeAlgorithm = useCallback(() => {
    setPlayState('playing');
    leftEngineRef.current.play(SPEED_MAP[speed]);
    if (isSplit) rightEngineRef.current.play(SPEED_MAP[speed]);
  }, [speed, isSplit]);

  const handlePlayButtonClick = useCallback(() => {
    if (playState === 'idle') {
      startAlgorithm();
    } else if (playState === 'playing') {
      pauseAlgorithm();
    } else if (playState === 'paused') {
      resumeAlgorithm();
    }
  }, [playState, startAlgorithm, pauseAlgorithm, resumeAlgorithm]);

  const getPlayButtonConfig = () => {
    if (playState === 'idle') return { text: '▶ Play', bg: '#2ed573' };
    if (playState === 'playing') return { text: '⏹ Stop', bg: '#ff4757' };
    return { text: '▶ Resume', bg: '#ffa502' };
  };
  const playConfig = getPlayButtonConfig();

  useEffect(() => {
    return () => {
      leftEngineRef.current.pause();
      rightEngineRef.current.pause();
      if (leftCanvasRef.current) disposeScatterRenderer(leftCanvasRef.current);
      if (rightCanvasRef.current) disposeScatterRenderer(rightCanvasRef.current);
    };
  }, []);

  useEffect(() => {
    if (playState === 'playing') {
      leftEngineRef.current.pause();
      if (isSplit) rightEngineRef.current.pause();
      leftEngineRef.current.play(SPEED_MAP[speed]);
      if (isSplit) rightEngineRef.current.play(SPEED_MAP[speed]);
    }
  }, [speed, isSplit, playState]);

  // ─── Render Panel ───
  const renderPanel = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    algo: string,
    setAlgo: (algo: string) => void,
    showDetails: boolean,
    setShowDetails: (show: boolean) => void,
    label: string,
    finished: React.MutableRefObject<boolean>
  ) => {
    const info = getInfo('optimization', algo);
    const isLocked = playState === 'playing';

    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          margin: label === 'Left' ? '0 4px 0 0' : '0 0 0 4px',
          background: '#141b2d',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
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
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{label}:</span>
            <select
              value={algo}
              onChange={(e) => { setAlgo(e.target.value); setShowDetails(false); }}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#0f172a',
                color: isLocked ? '#64748b' : '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '12px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isLocked ? 0.6 : 1,
              }}
              disabled={isLocked}
            >
              {algorithmIds.map((id) => (
                <option key={id} value={id}>{getDisplayName('optimization', id)}</option>
              ))}
            </select>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: showDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: showDetails ? '#38bdf8' : '#94a3b8',
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
            {finished.current && <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>✅</span>}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
            Steps: {label === 'Left' ? leftStepCount.current : rightStepCount.current}
          </div>
        </div>

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
            ref={canvasRef}
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

        {showDetails && info && (
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
              onClick={() => setShowDetails(false)}
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
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Controls */}
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
      </div>

      {/* Main Area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: '#141b2d',
          borderRadius: '10px',
          border: '1px solid #1e293b',
        }}
      >
        {!isSplit ? (
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
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Algorithm:</span>
                <select
                  value={leftAlgo}
                  onChange={(e) => { setLeftAlgo(e.target.value); setShowLeftDetails(false); }}
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
                    <option key={id} value={id}>{getDisplayName('optimization', id)}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowLeftDetails(!showLeftDetails)}
                  style={{
                    background: showLeftDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: showLeftDetails ? '#38bdf8' : '#94a3b8',
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
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                Steps: {leftStepCount.current}
              </div>
            </div>

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

            {showLeftDetails && (() => {
              const info = getInfo('optimization', leftAlgo);
              if (!info) return null;
              return (
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
                    onClick={() => setShowLeftDetails(false)}
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
                    {info.name}
                  </h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#94a3b8', lineHeight: '1.5' }}>
                    {info.description}
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
                    <span>⚡ Best: {info.bestCase}</span>
                    <span>📊 Avg: {info.avgCase}</span>
                    <span>🐌 Worst: {info.worstCase}</span>
                    <span>💾 Space: {info.spaceComplexity}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flex: 1, height: '100%', minHeight: 0 }}>
            {renderPanel(
              leftCanvasRef,
              leftAlgo,
              setLeftAlgo,
              showLeftDetails,
              setShowLeftDetails,
              'Left',
              leftFinished
            )}
            {renderPanel(
              rightCanvasRef,
              rightAlgo,
              setRightAlgo,
              showRightDetails,
              setShowRightDetails,
              'Right',
              rightFinished
            )}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          background: '#141b2d',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '14px',
          color: '#94a3b8',
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        {metadata || 'Press Play to start optimization!'}
      </div>
    </div>
  );
};

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

export default OptimizationFeature;