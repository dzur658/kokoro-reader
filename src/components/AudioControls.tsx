import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { audioDiagnostics, AudioDiagnosticResult } from '../services/audio-diagnostics';
import { ttsDebugger } from '../utils/debug-utils';
import { useTTSHealthCheck } from '../hooks/useTTSHealthCheck';
import { logger } from '../utils/logger';
import './AudioControls.css';

interface AudioControlsProps {
  text: string;
}

export const AudioControls: React.FC<AudioControlsProps> = ({ text }) => {
  const { 
    playerState, 
    generateSpeech, 
    play, 
    pause, 
    stop, 
    resetGeneration,
    isReady, 
    hasGenerated,
    ttsLoading,
    isSystemLoading
  } = useAudioPlayer();

  // Add TTS health monitoring
  const { error: ttsHealthError } = useTTSHealthCheck();

  // Add state for diagnostics
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<AudioDiagnosticResult[]>([]);

  // Update the debug state logging useEffect
  useEffect(() => {
    // Only log when state actually changes to reduce console spam
    const currentState = { isSystemLoading, ttsLoading, isReady };
    logger.debug('audio-controls', 'Current state', currentState);
  }, [isSystemLoading, ttsLoading, isReady]); // Add dependencies to prevent excessive logging

  const runDiagnostics = async () => {
    try {
      const results = await audioDiagnostics.runFullDiagnostics();
      setDiagnosticResults(results);
      setShowDiagnostics(true);
      
      // Also log TTS debug info
      const debugLogs = ttsDebugger.getLogs();
      logger.debug('audio-controls', 'TTS debug logs retrieved', { logCount: debugLogs.length });
    } catch (error) {
      logger.error('audio-controls', 'Diagnostics failed', error);
    }
  };

  const handlePlayClick = async () => {
    try {
      if (!hasGenerated && text) {
        await generateSpeech(text);
      }
      
      if (isReady) {
        play();
      }
    } catch (error) {
      logger.error('audio-controls', 'Play error', error);
    }
  };

  const handlePauseClick = () => {
    try {
      pause();
    } catch (error) {
      logger.error('audio-controls', 'Pause click error', error);
    }
  };

  const handleStopClick = () => {
    stop();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!text) {
    return null;
  }

  return (
    <div className="audio-controls">
      <div className="audio-controls-header">
        <h3>Audio Playback</h3>
        {playerState.error && (
          <div className="audio-error">Error: {playerState.error}</div>
        )}
        {ttsHealthError && (
          <div className="audio-error">
            TTS Loading Error: {ttsHealthError}
            <button 
              className="retry-btn" 
              onClick={resetGeneration}
              style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
            >
              Retry TTS
            </button>
          </div>
        )}
        {playerState.state === 'error' && playerState.error?.includes('generation') && (
          <div className="audio-error">
            TTS Generation Error: {playerState.error}
            <button 
              className="retry-btn" 
              onClick={resetGeneration}
              style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="audio-controls-buttons">
        {playerState.state === 'playing' ? (
          <button
            className="audio-btn pause-btn"
            onClick={handlePauseClick}
            disabled={isSystemLoading}
          >
            ⏸️ Pause
          </button>
        ) : (
          <button
            className="audio-btn play-btn"
            onClick={handlePlayClick}
            disabled={isSystemLoading || playerState.state === 'error'}
          >
            {isSystemLoading ? '⏳ Loading...' : 
             !hasGenerated ? '▶️ Generate Speech' : '▶️ Play'}
          </button>
        )}

        <button
          className="audio-btn stop-btn"
          onClick={handleStopClick}
          disabled={isSystemLoading || playerState.state === 'idle'}
        >
          ⏹️ Stop
        </button>

        <button
          className="audio-btn diagnostic-btn"
          onClick={runDiagnostics}
          style={{ marginLeft: '10px', backgroundColor: '#007acc' }}
        >
          🔍 Run Diagnostics
        </button>
      </div>

      {((playerState.duration || 0) > 0 || (playerState.currentTime || 0) > 0) && (
        <div className="audio-progress">
          <div className="audio-time">
            {formatTime(playerState.currentTime || 0)} / {formatTime(playerState.duration || 0)}
          </div>
          <div className="audio-progress-bar">
            <div 
              className="audio-progress-fill"
              style={{ 
                width: (playerState.duration || 0) > 0 
                  ? `${((playerState.currentTime || 0) / (playerState.duration || 0)) * 100}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      )}

      {playerState.state === 'loading' && (
        <div className="audio-loading">
          Initializing Kokoro TTS model... This may take a moment on first use.
        </div>
      )}

      {showDiagnostics && (
        <div className="diagnostic-results" style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Audio System Diagnostics</h4>
          {diagnosticResults.map((category, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <strong>{category.category}:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {category.checks.map((check: any, checkIdx: number) => (
                  <li key={checkIdx} style={{ color: check.passed ? 'green' : 'red' }}>
                    {check.passed ? '✅' : '❌'} {check.name}: {check.details}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button onClick={() => setShowDiagnostics(false)} style={{ marginTop: '10px' }}>
            Close Diagnostics
          </button>
        </div>
      )}
    </div>
  );
};
