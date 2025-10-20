import RabbitLyrics from 'rabbit-lyrics';

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

interface LyricLine {
  startTime: number;
  endTime: number;
  text: string;
  words: WordTiming[];
}

export class LyricsSyncService {
  private static estimateWordTimings(text: string, audioDuration: number): LyricLine[] {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    
    if (totalWords === 0) return [];

    // Estimar duración por palabra basada en características del texto
    const avgCharsPerWord = text.length / totalWords;
    let baseDurationPerWord = audioDuration / totalWords;
    
    // Ajustar tiempos basados en longitud de palabra y características del idioma
    const wordTimings: WordTiming[] = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      // Calcular duración basada en longitud de palabra
      const wordLength = word.length;
      const lengthMultiplier = Math.max(0.5, Math.min(2, wordLength / avgCharsPerWord));
      
      // Pausas más largas después de puntuación
      const pauseMultiplier = /[.!?]$/.test(word) ? 1.5 : /[,;:]$/.test(word) ? 1.2 : 1;
      
      const wordDuration = baseDurationPerWord * lengthMultiplier * pauseMultiplier;
      
      wordTimings.push({
        word: word,
        startTime: currentTime,
        endTime: currentTime + wordDuration
      });
      
      currentTime += wordDuration;
    });
    
    // Normalizar tiempos para que coincidan con la duración total
    const totalEstimatedTime = wordTimings[wordTimings.length - 1].endTime;
    const scaleFactor = audioDuration / totalEstimatedTime;
    
    wordTimings.forEach(timing => {
      timing.startTime *= scaleFactor;
      timing.endTime *= scaleFactor;
    });
    
    // Crear líneas de texto (dividir en frases)
    return this.groupWordsIntoLines(wordTimings);
  }
  
  private static groupWordsIntoLines(wordTimings: WordTiming[]): LyricLine[] {
    const lines: LyricLine[] = [];
    let currentLine: WordTiming[] = [];
    let wordsInLine = 0;
    const maxWordsPerLine = 8; // Máximo de palabras por línea
    
    wordTimings.forEach((timing, index) => {
      currentLine.push(timing);
      wordsInLine++;
      
      // Nueva línea si:
      // - Se alcanzó el máximo de palabras
      // - La palabra termina con puntuación fuerte
      // - Es la última palabra
      const shouldBreakLine = 
        wordsInLine >= maxWordsPerLine || 
        /[.!?]$/.test(timing.word) || 
        index === wordTimings.length - 1;
        
      if (shouldBreakLine) {
        lines.push({
          startTime: currentLine[0].startTime,
          endTime: currentLine[currentLine.length - 1].endTime,
          text: currentLine.map(w => w.word).join(' '),
          words: [...currentLine]
        });
        currentLine = [];
        wordsInLine = 0;
      }
    });
    
    return lines;
  }
  
  static formatForRabbitLyrics(lines: LyricLine[]): string {
    return lines.map(line => {
      const minutes = Math.floor(line.startTime / 60);
      const seconds = line.startTime % 60;
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}]`;
      return `${timestamp} ${line.text}`;
    }).join('\n');
  }
  
  static async createSyncedLyrics(text: string, audioBlob: Blob): Promise<{
    lyricsText: string;
    wordTimings: WordTiming[];
    duration: number;
  }> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onloadedmetadata = () => {
        try {
          const duration = audio.duration;
          const lines = this.estimateWordTimings(text, duration);
          const lyricsText = this.formatForRabbitLyrics(lines);
          const wordTimings = lines.flatMap(line => line.words);
          
          URL.revokeObjectURL(audioUrl);
          resolve({
            lyricsText,
            wordTimings,
            duration
          });
        } catch (error) {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        }
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Error al cargar el audio para sincronización'));
      };
      
      audio.load();
    });
  }
  
  static initializeRabbitLyrics(lyricsElement: HTMLElement, audioElement: HTMLAudioElement): RabbitLyrics {
    return new RabbitLyrics({
      element: lyricsElement,
      mediaElement: audioElement
    });
  }
}