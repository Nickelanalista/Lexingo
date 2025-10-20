import { useState, useRef, useCallback, useEffect } from 'react';
import { AudiobookService } from '../services/audiobookService';
import { PreciseTimingService } from '../services/preciseTimingService';

export interface AudiobookState {
  isPlaying: boolean;
  isLoading: boolean;
  currentText: string;
  currentWordIndex: number;
  playbackSpeed: number;
  voice: string;
  language: string;
  audioBlob: Blob | null;
  usePreciseSync: boolean;
  currentTime: number;
  duration: number;
}

export interface AudiobookControls {
  play: (text: string, language?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setVoice: (voice: string) => void;
  jumpToWord: (wordIndex: number) => void;
  enablePreciseSync: () => void;
}

const VOICES = {
  en: ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'],
  es: ['nova', 'coral', 'ballad', 'ash', 'sage'],
  fr: ['coral', 'ballad', 'nova', 'echo'],
} as const;

export const useAudiobook = (): [AudiobookState, AudiobookControls] => {
  const [state, setState] = useState<AudiobookState>({
    isPlaying: false,
    isLoading: false,
    currentText: '',
    currentWordIndex: 0,
    playbackSpeed: 1.0,
    voice: 'nova',
    language: 'en',
    audioBlob: null,
    usePreciseSync: true, // Activar sincronización precisa por defecto
    currentTime: 0,
    duration: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef<string[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const dynamicTrackerRef = useRef<ReturnType<typeof PreciseTimingService.createDynamicTracker> | null>(null);
  const wordTimingsRef = useRef<any[]>([]);

  // Limpiar URL del audio anterior para evitar memory leaks
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Función para obtener audio de TTS
  const getAudioFromTTS = useCallback(async (text: string, language: string, voice: string) => {
    // Validar texto
    const validation = AudiobookService.validateText(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return await AudiobookService.generateSpeech(text, language, voice);
  }, []);

  // Función para iniciar la reproducción
  const play = useCallback(async (text: string, language = state.language) => {
    try {
      if (!text || text.trim().length === 0) {
        console.error('[Audiolibro] Texto vacío');
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, currentText: text, language }));
      
      // Limpiar audio anterior
      cleanupAudioUrl();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Dividir texto en palabras para el seguimiento
      wordsRef.current = text.split(/\s+/).filter(word => word.length > 0);

      // Obtener el mejor voice para el idioma
      const availableVoices = VOICES[language as keyof typeof VOICES] || VOICES.en;
      const selectedVoice = availableVoices.includes(state.voice as any) ? state.voice : availableVoices[0];

      // Generar audio
      const audioBlob = await getAudioFromTTS(text, language, selectedVoice);
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      // Actualizar estado con el audioBlob para sincronización precisa
      setState(prev => ({ ...prev, audioBlob }));

      // Crear elemento de audio
      const audio = new Audio(audioUrl);
      audio.playbackRate = state.playbackSpeed;
      audioRef.current = audio;

      // Preparar timing preciso cuando esté habilitado
      audio.onloadedmetadata = () => {
        setState(prev => ({ ...prev, isLoading: false }));
        
        if (state.usePreciseSync) {
          const duration = audio.duration;
          const wordTimings = PreciseTimingService.calculatePreciseWordTimings(text, language, duration);
          wordTimingsRef.current = wordTimings;
          dynamicTrackerRef.current = PreciseTimingService.createDynamicTracker(wordTimings, language, text);
        }
      };

      // Remover onloadeddata ya que usamos onloadedmetadata arriba

      audio.onplay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
        startWordTracking();
      };

      audio.onpause = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        stopWordTracking();
      };

      audio.onended = () => {
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentWordIndex: 0 
        }));
        stopWordTracking();
        cleanupAudioUrl();
      };

      audio.onerror = () => {
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          isLoading: false 
        }));
        stopWordTracking();
        cleanupAudioUrl();
      };

      // Comenzar reproducción
      await audio.play();

    } catch (error) {
      console.error('[Audiolibro] Error:', error);
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false 
      }));
      cleanupAudioUrl();
    }
  }, [state.language, state.voice, state.playbackSpeed, getAudioFromTTS, cleanupAudioUrl]);

  // Función para el seguimiento de palabras con timing preciso
  const startWordTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const totalWords = wordsRef.current.length;
    if (totalWords === 0 || !audioRef.current) return;

    startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);

    intervalRef.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        const currentTime = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        
        if (duration > 0) {
          let newWordIndex: number;
          
          // Usar timing preciso si está habilitado y disponible
          if (state.usePreciseSync && dynamicTrackerRef.current) {
            newWordIndex = dynamicTrackerRef.current.getCurrentWordIndex(currentTime);
            
            // Ajustar timing dinámicamente si hay desviación
            const expectedTime = dynamicTrackerRef.current.getNextExpectedTime(newWordIndex);
            if (Math.abs(currentTime - expectedTime) > 0.2) {
              dynamicTrackerRef.current.adjustTiming(newWordIndex, currentTime);
              
              // Registrar feedback para aprendizaje adaptativo cada 10 palabras
              if (newWordIndex % 10 === 0) {
                dynamicTrackerRef.current.recordFeedback(newWordIndex, expectedTime, currentTime);
              }
            }
          } else {
            // Fallback a método básico
            const progress = Math.min(currentTime / duration, 1);
            newWordIndex = Math.floor(progress * totalWords);
          }
          
          setState(prev => ({ 
            ...prev, 
            currentWordIndex: Math.min(newWordIndex, totalWords - 1),
            currentTime: currentTime,
            duration: duration
          }));
        }
      }
    }, 50); // Reducir intervalo a 50ms para mayor precisión
  }, [state.usePreciseSync]);

  // Función para detener el seguimiento de palabras
  const stopWordTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Pausar reproducción
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      pausedAtRef.current = audioRef.current.currentTime;
      audioRef.current.pause();
      stopWordTracking();
      // Forzar actualización de estado si no se dispara el evento onpause
      setTimeout(() => {
        setState(prev => ({ ...prev, isPlaying: false }));
      }, 100);
    }
  }, [stopWordTracking]);

  // Reanudar reproducción
  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.currentTime = pausedAtRef.current;
      audioRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
        startWordTracking();
      }).catch((error) => {
        console.error('[Audiolibro] Error reanudando reproducción:', error);
        setState(prev => ({ ...prev, isPlaying: false }));
      });
    }
  }, [startWordTracking]);

  // Detener reproducción
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopWordTracking();
    pausedAtRef.current = 0;
    setState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentWordIndex: 0 
    }));
    cleanupAudioUrl();
  }, [stopWordTracking, cleanupAudioUrl]);

  // Cambiar velocidad de reproducción
  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  // Cambiar voz
  const setVoice = useCallback((voice: string) => {
    setState(prev => ({ ...prev, voice }));
  }, []);

  // Saltar a una palabra específica
  const jumpToWord = useCallback((wordIndex: number) => {
    if (audioRef.current && wordIndex >= 0 && wordIndex < wordsRef.current.length) {
      const totalWords = wordsRef.current.length;
      const progress = wordIndex / totalWords;
      const newTime = audioRef.current.duration * progress;
      
      audioRef.current.currentTime = newTime;
      pausedAtRef.current = newTime;
      setState(prev => ({ ...prev, currentWordIndex: wordIndex }));
    }
  }, []);

  // Función para activar sincronización precisa
  const enablePreciseSync = useCallback(() => {
    setState(prev => ({ ...prev, usePreciseSync: true }));
    
    // Si ya hay audio cargado, regenerar los timings
    if (audioRef.current && state.currentText && state.language) {
      const duration = audioRef.current.duration;
      if (duration > 0) {
        const wordTimings = PreciseTimingService.calculatePreciseWordTimings(state.currentText, state.language, duration);
        wordTimingsRef.current = wordTimings;
        dynamicTrackerRef.current = PreciseTimingService.createDynamicTracker(wordTimings, state.language, state.currentText);
      }
    }
  }, [state.currentText, state.language]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopWordTracking();
      cleanupAudioUrl();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stopWordTracking, cleanupAudioUrl]);

  const controls: AudiobookControls = {
    play,
    pause,
    resume,
    stop,
    setSpeed,
    setVoice,
    jumpToWord,
    enablePreciseSync,
  };

  return [state, controls];
};