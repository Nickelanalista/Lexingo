import React from 'react';
import { AdaptiveTimingService } from '../services/adaptiveTimingService';

interface AudiobookDebugInfoProps {
  isVisible: boolean;
  currentWordIndex: number;
  totalWords: number;
  currentTime: number;
  duration: number;
  usePreciseSync: boolean;
  language?: string;
}

const AudiobookDebugInfo: React.FC<AudiobookDebugInfoProps> = ({
  isVisible,
  currentWordIndex,
  totalWords,
  currentTime,
  duration,
  usePreciseSync,
  language = 'en'
}) => {
  if (!isVisible) return null;

  const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;
  const timeProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const calibration = AdaptiveTimingService.getCalibration(language);

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
      <div className="space-y-1">
        <div className="font-semibold text-yellow-300">📊 Debug Audio</div>
        <div>Sincronización: {usePreciseSync ? '🎯 Precisa' : '⚡ Básica'}</div>
        <div>Palabra: {currentWordIndex + 1}/{totalWords}</div>
        <div>Progreso: {progress.toFixed(1)}%</div>
        <div>Audio: {timeProgress.toFixed(1)}%</div>
        <div>Tiempo: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s</div>
        <div className={`font-medium ${Math.abs(progress - timeProgress) > 5 ? 'text-red-400' : 'text-green-400'}`}>
          Diferencia: {Math.abs(progress - timeProgress).toFixed(1)}%
        </div>
        
        {calibration && (
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="font-semibold text-blue-300">🤖 Calibración IA</div>
            <div>Muestras: {calibration.sampleSize}</div>
            <div>Confianza: {(calibration.confidence * 100).toFixed(0)}%</div>
            <div>Ajuste: {(calibration.avgSpeechRateAdjustment * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudiobookDebugInfo;