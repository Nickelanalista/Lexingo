import React from 'react';

interface KaraokeTextProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  className?: string;
  onWordClick?: (wordIndex: number) => void;
}

const KaraokeText: React.FC<KaraokeTextProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  className = '',
  onWordClick
}) => {
  const words = text.split(/(\s+)/).filter(word => word.length > 0);
  let wordIndex = 0;

  return (
    <div className={`leading-relaxed ${className}`}>
      {words.map((segment, index) => {
        // Si el segmento es solo espacios en blanco, renderizar tal como está
        if (/^\s+$/.test(segment)) {
          return <span key={index}>{segment}</span>;
        }

        // Es una palabra real
        const isCurrentWord = isPlaying && wordIndex === currentWordIndex;
        const isPassedWord = isPlaying && wordIndex < currentWordIndex;
        const currentIdx = wordIndex++;

        return (
          <span
            key={index}
            onClick={() => onWordClick?.(currentIdx)}
            className={`transition-all duration-300 cursor-pointer ${
              isCurrentWord
                ? 'bg-gradient-to-r from-yellow-400/40 to-orange-400/40 text-orange-200 font-semibold shadow-lg transform scale-105 rounded px-1'
                : isPassedWord
                ? 'text-blue-300 opacity-90'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/30 rounded px-0.5'
            } ${
              isCurrentWord ? 'animate-pulse' : ''
            }`}
            title={onWordClick ? `Saltar a esta palabra` : undefined}
          >
            {segment}
          </span>
        );
      })}
    </div>
  );
};

export default KaraokeText;