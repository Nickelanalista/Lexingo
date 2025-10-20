import React, { useEffect, useRef, useState } from 'react';
import { LyricsSyncService } from '../services/lyricsSyncService';
import RabbitLyrics from 'rabbit-lyrics';

interface SyncedLyricsDisplayProps {
  text: string;
  audioBlob: Blob | null;
  isPlaying: boolean;
  onWordClick?: (wordIndex: number) => void;
  className?: string;
}

const SyncedLyricsDisplay: React.FC<SyncedLyricsDisplayProps> = ({
  text,
  audioBlob,
  isPlaying,
  onWordClick,
  className = ''
}) => {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rabbitLyricsRef = useRef<RabbitLyrics | null>(null);
  const [lyricsContent, setLyricsContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Efecto para procesar el audio y crear las lyrics sincronizadas
  useEffect(() => {
    if (!audioBlob || !text) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    LyricsSyncService.createSyncedLyrics(text, audioBlob)
      .then(({ lyricsText }) => {
        setLyricsContent(lyricsText);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('[SyncedLyrics] Error creando lyrics:', error);
        setIsLoading(false);
      });
  }, [text, audioBlob]);

  // Efecto para inicializar RabbitLyrics
  useEffect(() => {
    if (!audioBlob || !lyricsContent || !lyricsRef.current || !audioRef.current) return;

    // Configurar elemento de audio
    const audioUrl = URL.createObjectURL(audioBlob);
    audioRef.current.src = audioUrl;

    // Actualizar contenido del elemento lyrics
    lyricsRef.current.textContent = lyricsContent;

    // Esperar a que el audio esté cargado antes de inicializar RabbitLyrics
    const handleLoadedMetadata = () => {
      try {
        if (lyricsRef.current && audioRef.current) {
          rabbitLyricsRef.current = new RabbitLyrics({
            element: lyricsRef.current,
            mediaElement: audioRef.current,
            viewMode: 'default'
          });
        }
      } catch (error) {
        console.error('[SyncedLyrics] Error inicializando RabbitLyrics:', error);
        // Silenciar el error y usar fallback
      }
    };

    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = '';
      }
      if (rabbitLyricsRef.current) {
        rabbitLyricsRef.current = null;
      }
    };
  }, [lyricsContent, audioBlob]);

  // Efecto para controlar reproducción
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error('[SyncedLyrics] Error reproduciendo audio:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Sincronizando audio...</span>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className={`text-gray-500 text-center p-8 ${className}`}>
        No hay texto para mostrar
      </div>
    );
  }

  return (
    <div className={`synced-lyrics-container ${className}`}>
      <div 
        ref={lyricsRef}
        className="rabbit-lyrics"
        data-media-element="#synced-audio"
        data-view-mode="default"
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: 'var(--text-color)',
          '--rl-highlight-color': '#f59e0b',
          '--rl-active-color': '#3b82f6'
        } as React.CSSProperties}
        onClick={(e) => {
          // Manejar clics en palabras si es necesario
          if (onWordClick) {
            const target = e.target as HTMLElement;
            const wordElement = target.closest('[data-word-index]');
            if (wordElement) {
              const wordIndex = parseInt(wordElement.getAttribute('data-word-index') || '0');
              onWordClick(wordIndex);
            }
          }
        }}
      >
        {lyricsContent}
      </div>
      
      {/* Audio element para RabbitLyrics */}
      <audio 
        id="synced-audio" 
        ref={audioRef}
        style={{ display: 'none' }}
        preload="metadata"
      />
      
      {/* Estilos CSS para rabbit-lyrics */}
      <style>{`
        .rabbit-lyrics {
          --rl-highlight-color: #f59e0b;
          --rl-active-color: #3b82f6;
          --rl-past-color: #6b7280;
        }
        
        .rabbit-lyrics .rl-line {
          margin: 0.5em 0;
          transition: all 0.3s ease;
        }
        
        .rabbit-lyrics .rl-line.rl-active {
          color: var(--rl-active-color);
          font-weight: 600;
          transform: scale(1.02);
        }
        
        .rabbit-lyrics .rl-line.rl-past {
          color: var(--rl-past-color);
          opacity: 0.7;
        }
        
        .rabbit-lyrics .rl-word {
          transition: all 0.2s ease;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
        }
        
        .rabbit-lyrics .rl-word.rl-highlight {
          background-color: var(--rl-highlight-color);
          color: white;
          transform: scale(1.1);
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        
        .rabbit-lyrics .rl-word:hover {
          background-color: rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
        
        /* Dark mode support */
        .dark .rabbit-lyrics {
          --rl-highlight-color: #fbbf24;
          --rl-active-color: #60a5fa;
          --rl-past-color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default SyncedLyricsDisplay;