import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioPlayerState, TTSOptions } from '../types/tts';
import { lazyTTSService } from '../services/lazy-tts-service';
import { createAudioBlobUrl, cleanupAudioUrl } from '../utils/audio-utils';
import { useExtensionSafety } from './useExtensionSafety';
import { useLazyTTS } from './useLazyTTS';
import { ttsDebugger } from '../utils/debug-utils';
import { logger } from '../utils/logger';

/**
 * Custom hook for managing audio player state and TTS functionality
 */
export const useAudioPlayer = () => {
  const { isExtensionHealthy, handleExtensionContextLoss } = useExtensionSafety();
  const { isLoading: ttsLoading, initializeTTS } = useLazyTTS();
  
  // Add interval tracking to prevent memory leaks
  const activeIntervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // Helper function to track intervals
  const createTrackedInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const intervalId = setInterval(callback, delay);
    activeIntervalsRef.current.add(intervalId);
    return intervalId;
  }, []);
  
  // Helper function to clear tracked interval
  const clearTrackedInterval = useCallback((intervalId: NodeJS.Timeout): void => {
    clearInterval(intervalId);
    activeIntervalsRef.current.delete(intervalId);
  }, []);
  
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    state: 'idle',
    currentTime: 0,
    duration: 0,
    error: '',
    isLoading: false
  });

  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastLoggedState, setLastLoggedState] = useState<string>('');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const lazyTTSServiceRef = useRef(lazyTTSService);
  const generatingRef = useRef(false);

  // Add polling configuration
  const STATE_SYNC_INTERVAL = 500; // 500ms for responsive UI updates

  // Replace the TTS initialization check useEffect
  useEffect(() => {
    let ignore = false;
    let intervalId: NodeJS.Timeout | null = null;

    const syncTTSState = () => {
      if (ignore) return;
      
      // Get fresh state from TTS service
      const serviceState = lazyTTSServiceRef.current.getLoadingState();
      const isServiceReady = lazyTTSServiceRef.current.isReady();
      
      // Use shallow comparison instead of JSON.stringify for better performance
      const currentState = {
        serviceLoading: serviceState.isLoading,
        serviceLoaded: serviceState.isLoaded,
        serviceReady: isServiceReady,
        playerLoading: playerState.isLoading,
        hasGenerated
      };
      
      // Check if state actually changed using shallow comparison
      const stateChanged = 
        currentState.serviceLoading !== (lastLoggedState.includes('serviceLoading":true')) ||
        currentState.serviceReady !== (lastLoggedState.includes('serviceReady":true')) ||
        currentState.playerLoading !== (lastLoggedState.includes('playerLoading":true')) ||
        currentState.hasGenerated !== (lastLoggedState.includes('hasGenerated":true'));
      
      if (stateChanged) {
        const stateString = JSON.stringify(currentState);
        logger.debug('audio-player', 'State changed', currentState);
        setLastLoggedState(stateString);
      }
      
      // Update player state if TTS service state changed
      if (serviceState.error && !playerState.error) {
        setPlayerState(prev => ({
          ...prev,
          state: 'error',
          error: serviceState.error || undefined,
          isLoading: false
        }));
      }
    };

    // Initial sync
    syncTTSState();

    // Set up tracked polling for state synchronization
    intervalId = createTrackedInterval(syncTTSState, STATE_SYNC_INTERVAL);

    return () => {
      ignore = true;
      if (intervalId) {
        clearTrackedInterval(intervalId);
      }
    };
  }, [playerState.isLoading, playerState.error, hasGenerated, createTrackedInterval, clearTrackedInterval]);
  // REMOVED: lastLoggedState from dependencies - it's updated inside the effect
  // and doesn't need to trigger re-runs

  // Pre-create audio element and manage its lifecycle
  useEffect(() => {
    // Pre-create audio element with optimized settings
    const audioElement = new Audio();
    audioElement.preload = 'auto'; // Changed from 'none' to 'auto'
    audioElement.crossOrigin = 'anonymous'; // Enable CORS for blob URLs
    
    // Set up persistent event listeners
    const handleLoadedMetadata = () => {
      logger.debug('audio-player', 'Audio metadata loaded', {
        duration: audioElement.duration,
        readyState: audioElement.readyState
      });
      setPlayerState(prev => ({
        ...prev,
        duration: audioElement.duration,
        currentTime: 0
      }));
    };

    const handleCanPlayThrough = () => {
      logger.debug('audio-player', 'Audio can play through', {
        buffered: audioElement.buffered.length,
        readyState: audioElement.readyState
      });
    };

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({ ...prev, currentTime: audioElement.currentTime }));
    };

    const handleEnded = () => {
      logger.debug('audio-player', 'Audio playback ended');
      setPlayerState(prev => ({ ...prev, state: 'stopped', currentTime: 0 }));
    };

    const handleError = (_event: Event) => {
      const error = audioElement.error;
      logger.error('audio-player', 'Audio playback error', {
        code: error?.code,
        message: error?.message,
        src: audioElement.src.substring(0, 50)
      });
      setPlayerState(prev => ({
        ...prev,
        state: 'error',
        isLoading: false,
        error: `Audio playback error: ${error?.message || 'Unknown error'}`
      }));
    };

    // Add event listeners
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    audioElementRef.current = audioElement;

    // Cleanup function
    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.pause();
      audioElement.src = '';
      audioElement.load();
    };
  }, []);

  /**
   * Generate speech from text using lazy TTS service
   */
  const generateSpeech = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (hasGenerated || generatingRef.current) {
      ttsDebugger.log('generateSpeech-skip', true, { 
        hasGenerated, 
        generating: generatingRef.current 
      }, 'Already generated or generating, skipping');
      return;
    }

    generatingRef.current = true;

    ttsDebugger.log('generateSpeech-start', true, {
      textLength: text.length,
      options,
      extensionHealthy: isExtensionHealthy,
      ttsReady: lazyTTSServiceRef.current.isReady()
    });

    try {
      setPlayerState(prev => ({ ...prev, state: 'loading', isLoading: true, error: '' }));

      // Initialize TTS if not loaded
      if (!lazyTTSServiceRef.current.isReady()) {
        ttsDebugger.log('tts-init-start', true, {}, 'Initializing TTS service');
        await initializeTTS();
        ttsDebugger.log('tts-init-complete', true, { ready: lazyTTSServiceRef.current.isReady() });
      }

      const result = await lazyTTSServiceRef.current.generateSpeech(text, options);
      
      ttsDebugger.log('speech-generation-complete', true, {
        audioLength: result.audio?.length,
        sampleRate: result.sampleRate,
        duration: result.duration
      });
      
      // Create audio blob URL
      const audioUrl = createAudioBlobUrl(result.audio, result.sampleRate);
      
      ttsDebugger.log('blob-url-created', true, {
        urlLength: audioUrl.length,
        urlPrefix: audioUrl.substring(0, 20)
      });
      
      // Clean up previous audio URL
      if (audioUrlRef.current) {
        cleanupAudioUrl(audioUrlRef.current);
      }
      audioUrlRef.current = audioUrl;

      // Use pre-created audio element
      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        
        // Wait for audio to be ready before marking as loaded
        const waitForAudioReady = new Promise<void>((resolve, reject) => {
          // Check if audio is already ready (race condition fix)
          if (audioElementRef.current && audioElementRef.current.readyState >= 4) {
            logger.debug('audio-player', 'Audio already ready for playback', {
              duration: audioElementRef.current.duration,
              readyState: audioElementRef.current.readyState
            });
            resolve();
            return;
          }
          
          const timeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000); // 10 second timeout

          const handleCanPlay = () => {
            clearTimeout(timeout);
            audioElementRef.current?.removeEventListener('canplaythrough', handleCanPlay);
            logger.debug('audio-player', 'Audio ready for playback', {
              duration: audioElementRef.current?.duration,
              readyState: audioElementRef.current?.readyState
            });
            resolve();
          };

          audioElementRef.current?.addEventListener('canplaythrough', handleCanPlay);
        });

        try {
          audioElementRef.current.load();
          await waitForAudioReady;
          
          // Update state to indicate audio is ready
          setPlayerState(prev => ({
            ...prev,
            state: 'stopped',
            isLoading: false,
            error: ''
          }));
        } catch (error) {
          logger.error('audio-player', 'Audio loading failed', error);
          throw new Error('Failed to load audio for playback');
        }
      }

      setHasGenerated(true);

    } catch (error) {
      logger.error('audio-player', 'Speech generation error', error);
      const errorMessage = error instanceof Error ? error.message : 'Speech generation failed';
      ttsDebugger.log('generateSpeech', false, { textLength: text.length, options }, errorMessage);
      
      setPlayerState(prev => ({
        ...prev,
        state: 'error',
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    } finally {
      generatingRef.current = false;
    }
  }, [hasGenerated, initializeTTS, isExtensionHealthy]);

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    try {
      if (!audioElementRef.current) {
        throw new Error('No audio to play');
      }

      // Audio operations are isolated from Chrome extension messaging
      await audioElementRef.current.play();
      setPlayerState(prev => ({ ...prev, state: 'playing' }));
    } catch (error) {
      logger.error('audio-player', 'Playback error', error);
      const errorMessage = error instanceof Error ? error.message : 'Playback failed';
      setPlayerState(prev => ({ ...prev, state: 'error', error: errorMessage }));
      
      // Handle extension context loss gracefully
      if (!isExtensionHealthy) {
        handleExtensionContextLoss(() => {
          logger.warn('audio-player', 'Audio play attempted while extension context is unhealthy');
        });
      }
    }
  }, [isExtensionHealthy, handleExtensionContextLoss]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    try {
      // Audio operations are isolated from Chrome extension messaging
      // This ensures pause works even if extension context is lost
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setPlayerState(prev => ({ 
          ...prev, 
          state: 'paused',
          currentTime: audioElementRef.current?.currentTime || 0
        }));
      }
    } catch (error) {
      logger.error('audio-player', 'Pause error', error);
      // Handle extension context loss gracefully
      if (!isExtensionHealthy) {
        handleExtensionContextLoss(() => {
          logger.warn('audio-player', 'Audio pause attempted while extension context is unhealthy');
        });
      }
    }
  }, [isExtensionHealthy, handleExtensionContextLoss]);

  /**
   * Stop audio and reset position
   */
  const stop = useCallback(() => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        setPlayerState(prev => ({ 
          ...prev, 
          state: 'stopped',
          currentTime: 0
        }));
      }
    } catch (error) {
      logger.error('audio-player', 'Stop error', error);
    }
  }, []);

  /**
   * Reset generation state to allow retry
   */
  const resetGeneration = useCallback(() => {
    setHasGenerated(false);
    setPlayerState(prev => ({ 
      ...prev, 
      state: 'idle', 
      error: '', 
      currentTime: 0,
      duration: 0 
    }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      try {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
          audioElementRef.current.load();
        }
        if (audioUrlRef.current) {
          cleanupAudioUrl(audioUrlRef.current);
        }
      } catch (error) {
        logger.error('audio-player', 'Cleanup error', error);
      }
    };
  }, []);

  // Replace the consolidated loading state management section
  const [systemState, setSystemState] = useState({
    isSystemLoading: false,
    isSystemReady: false
  });

  // Add system state polling
  useEffect(() => {
    let ignore = false;
    let intervalId: NodeJS.Timeout | null = null;

    const updateSystemState = () => {
      if (ignore) return;
      
      const serviceState = lazyTTSServiceRef.current.getLoadingState();
      const isServiceReady = lazyTTSServiceRef.current.isReady();
      const newIsSystemLoading = ttsLoading || playerState.isLoading || serviceState.isLoading;
      const newIsSystemReady = !newIsSystemLoading && 
                              !!audioElementRef.current && 
                              !!audioElementRef.current.src && 
                              isServiceReady;

      setSystemState(prev => {
        if (prev.isSystemLoading === newIsSystemLoading && 
            prev.isSystemReady === newIsSystemReady) {
          return prev;
        }
        
        // Log state transitions for debugging
        ttsDebugger.log('system-state-transition', true, {
          from: { loading: prev.isSystemLoading, ready: prev.isSystemReady },
          to: { loading: newIsSystemLoading, ready: newIsSystemReady },
          sources: {
            ttsLoading,
            playerLoading: playerState.isLoading,
            serviceLoading: serviceState.isLoading,
            serviceReady: isServiceReady,
            hasAudioElement: !!audioElementRef.current,
            hasAudioSrc: !!audioElementRef.current?.src
          }
        });
        
        return {
          isSystemLoading: newIsSystemLoading,
          isSystemReady: newIsSystemReady
        };
      });
    };

    // Initial update
    updateSystemState();

    // Poll system state with tracked interval
    intervalId = createTrackedInterval(updateSystemState, STATE_SYNC_INTERVAL);

    return () => {
      ignore = true;
      if (intervalId) {
        clearTrackedInterval(intervalId);
      }
    };
  }, [ttsLoading, playerState.isLoading, createTrackedInterval, clearTrackedInterval]);

  // Global cleanup to prevent any interval leaks
  useEffect(() => {
    return () => {
      // Clear all tracked intervals on unmount
      activeIntervalsRef.current.forEach(intervalId => {
        clearInterval(intervalId);
      });
      activeIntervalsRef.current.clear();
      
      logger.debug('audio-player', 'Global cleanup completed', {
        clearedIntervals: activeIntervalsRef.current.size
      });
    };
  }, []); // Empty dependency array - runs only on unmount

  // Update return statement to use new system state
  return {
    playerState,
    generateSpeech,
    play,
    pause,
    stop,
    resetGeneration,
    isReady: systemState.isSystemReady && hasGenerated,
    hasGenerated,
    ttsLoading,
    isSystemLoading: systemState.isSystemLoading,
    isSystemReady: systemState.isSystemReady
  };
};
