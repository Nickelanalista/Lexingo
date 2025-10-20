import React from 'react';
import { Play, Pause, Square, Volume2, Loader2 } from 'lucide-react';
import { AudiobookState, AudiobookControls } from '../hooks/useAudiobook';

interface AudiobookControlsProps {
  state: AudiobookState;
  controls: AudiobookControls;
  currentText: string;
  language: string;
  className?: string;
}

const AudiobookControlsComponent: React.FC<AudiobookControlsProps> = ({
  state,
  controls,
  currentText,
  language,
  className = ''
}) => {

  const handlePlayPause = async () => {
    if (state.isPlaying) {
      controls.pause();
    } else if (state.currentText === currentText) {
      controls.resume();
    } else {
      await controls.play(currentText, language);
    }
  };

  const handleStop = () => {
    controls.stop();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Botón principal de Play/Pause */}
      <div className="relative">
        <button
          onClick={handlePlayPause}
          disabled={state.isLoading}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            state.isPlaying
              ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30'
              : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30'
          }`}
          title={state.isLoading ? 'Generando audio...' : state.isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {state.isLoading ? (
            <Loader2 size={14} className="animate-spin text-blue-400" />
          ) : state.isPlaying ? (
            <Pause size={14} className="text-green-400" />
          ) : (
            <Play size={14} className="text-blue-400" />
          )}
        </button>
        
        {/* Indicador de progreso circular */}
        {state.isPlaying && state.currentText === currentText && (
          <div className="absolute inset-0 w-8 h-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${(state.currentWordIndex / (state.currentText?.split(' ').length || 1)) * 88} 88`}
                className="text-green-400 transition-all duration-300"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Botón de Stop */}
      {state.isPlaying && (
        <button
          onClick={handleStop}
          className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 flex items-center justify-center transition-all duration-200 hover:scale-110"
          title="Detener"
        >
          <Square size={10} className="text-red-400" fill="currentColor" />
        </button>
      )}

      {/* Indicador de velocidad */}
      {state.isPlaying && (
        <span className="text-xs text-gray-400 min-w-[3ch] text-center">
          {state.playbackSpeed}x
        </span>
      )}
    </div>
  );
};

export default AudiobookControlsComponent;