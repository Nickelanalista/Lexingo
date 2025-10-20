import { AdaptiveTimingService } from './adaptiveTimingService';

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  syllables: number;
  difficulty: number;
}

interface PhoneticAnalysis {
  avgSpeechRate: number; // palabras por minuto
  avgPauseAfterPunctuation: number; // segundos
  avgSyllableDuration: number; // segundos por sílaba
}

export class PreciseTimingService {
  private static readonly PHONETIC_PATTERNS = {
    // Patrones de sílabas en español
    es: {
      vowels: /[aeiouáéíóúü]/gi,
      consonantClusters: /[bcdfgjklmnñpqrstvwxyz]{2,}/gi,
      diphthongs: /[aeiou][iu]|[iu][aeiou]/gi
    },
    // Patrones de sílabas en inglés  
    en: {
      vowels: /[aeiou]/gi,
      consonantClusters: /[bcdfgjklmnpqrstvwxyz]{2,}/gi,
      silentE: /[^aeiou]e$/i
    },
    // Patrones de sílabas en francés
    fr: {
      vowels: /[aeiouyàâäéèêëïîôùûüÿç]/gi,
      consonantClusters: /[bcdfgjklmnpqrstvwxz]{2,}/gi,
      nasals: /[aeiou][mn]/gi
    }
  };

  private static readonly SPEECH_RATES = {
    // Palabras por minuto promedio por idioma
    es: 180,
    en: 160,
    fr: 170
  };

  private static readonly PUNCTUATION_PAUSES = {
    '.': 0.6,
    '!': 0.6,
    '?': 0.6,
    ';': 0.4,
    ':': 0.3,
    ',': 0.2,
    '-': 0.15,
    '—': 0.25, // Em dash
    '…': 0.5   // Ellipsis
  };

  static countSyllables(word: string, language: string): number {
    const patterns = this.PHONETIC_PATTERNS[language as keyof typeof this.PHONETIC_PATTERNS] || this.PHONETIC_PATTERNS.en;
    
    // Convertir a minúsculas
    word = word.toLowerCase().replace(/[^a-zñáéíóúüç]/g, '');
    
    if (word.length === 0) return 1;
    
    // Contar vocales
    const vowelMatches = word.match(patterns.vowels) || [];
    let syllableCount = vowelMatches.length;
    
    // Ajustes específicos por idioma
    if (language === 'en') {
      // En inglés, la 'e' final generalmente es silenciosa
      if (patterns.silentE && word.match(patterns.silentE)) {
        syllableCount = Math.max(1, syllableCount - 1);
      }
      // Diptongos reducen el conteo
      const diphthongs = word.match(/[aeiou]{2,}/gi) || [];
      syllableCount -= Math.floor(diphthongs.length * 0.5);
    } else if (language === 'es') {
      // En español, considerar diptongos
      const diphthongs = word.match(patterns.diphthongs) || [];
      syllableCount -= diphthongs.length * 0.3;
    }
    
    return Math.max(1, Math.round(syllableCount));
  }

  static calculateWordDifficulty(word: string, language: string): number {
    let difficulty = 1;
    
    // Longitud de palabra
    if (word.length > 8) difficulty += 0.3;
    if (word.length > 12) difficulty += 0.2;
    
    // Grupos consonánticos
    const consonantClusters = word.match(/[bcdfgjklmnñpqrstvwxyz]{3,}/gi) || [];
    difficulty += consonantClusters.length * 0.2;
    
    // Caracteres especiales
    if (language === 'es' && /[ñrr]/.test(word)) difficulty += 0.1;
    if (language === 'fr' && /[çàâäéèêëïîôùûüÿ]/.test(word)) difficulty += 0.1;
    
    return Math.min(2, difficulty);
  }

  static analyzeText(text: string, language: string): PhoneticAnalysis {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    
    if (totalWords === 0) {
      return {
        avgSpeechRate: 160,
        avgPauseAfterPunctuation: 0.3,
        avgSyllableDuration: 0.2
      };
    }
    
    // Calcular tasa de habla base
    const baseSpeechRate = this.SPEECH_RATES[language as keyof typeof this.SPEECH_RATES] || this.SPEECH_RATES.en;
    
    // Contar sílabas totales y calcular dificultad promedio
    let totalSyllables = 0;
    let totalDifficulty = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[.,!?;:-]/g, '');
      totalSyllables += this.countSyllables(cleanWord, language);
      totalDifficulty += this.calculateWordDifficulty(cleanWord, language);
    });
    
    const avgDifficulty = totalDifficulty / totalWords;
    
    // Contar pausas por puntuación con pesos diferentes
    const strongPunctuation = (text.match(/[.!?]/g) || []).length;
    const mediumPunctuation = (text.match(/[;:]/g) || []).length;
    const lightPunctuation = (text.match(/[,-]/g) || []).length;
    
    const avgPauseAfterPunctuation = (strongPunctuation * 0.6 + mediumPunctuation * 0.3 + lightPunctuation * 0.2) / totalWords;
    
    // Factores de ajuste más sofisticados
    const avgWordLength = text.replace(/\s+/g, '').length / totalWords;
    const lengthComplexityFactor = Math.max(0.8, Math.min(1.2, avgWordLength / 5));
    const difficultyFactor = Math.max(0.9, Math.min(1.1, avgDifficulty));
    
    // Factor para densidad de puntuación (más pausas = más lento)
    const punctuationDensity = (strongPunctuation + mediumPunctuation + lightPunctuation) / totalWords;
    const punctuationFactor = Math.max(0.95, Math.min(1.05, 1 - (punctuationDensity * 0.3)));
    
    const combinedComplexityFactor = lengthComplexityFactor * difficultyFactor * punctuationFactor;
    
    // Aplicar calibración adaptativa si está disponible
    const adaptiveSpeechRate = AdaptiveTimingService.adjustSpeechRate(baseSpeechRate, language);
    const adjustedSpeechRate = adaptiveSpeechRate / combinedComplexityFactor;
    
    let avgSyllableDuration = 60 / (adjustedSpeechRate * (totalSyllables / totalWords));
    avgSyllableDuration = AdaptiveTimingService.adjustSyllableDuration(avgSyllableDuration, language);
    
    // Aplicar calibración adaptativa a las pausas
    const adaptivePauseAfterPunctuation = AdaptiveTimingService.adjustPunctuationPause(
      Math.max(0.1, avgPauseAfterPunctuation), 
      language
    );

    return {
      avgSpeechRate: adjustedSpeechRate,
      avgPauseAfterPunctuation: adaptivePauseAfterPunctuation,
      avgSyllableDuration: Math.max(0.1, avgSyllableDuration)
    };
  }

  static calculatePreciseWordTimings(text: string, language: string, audioDuration: number): WordTiming[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const analysis = this.analyzeText(text, language);
    
    const wordTimings: WordTiming[] = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[.,!?;:-]/g, '');
      const syllables = this.countSyllables(cleanWord, language);
      const difficulty = this.calculateWordDifficulty(cleanWord, language);
      
      // Calcular duración base de la palabra
      let wordDuration = syllables * analysis.avgSyllableDuration * difficulty;
      
      // Añadir pausa después de puntuación
      const punctuation = word.match(/[.,!?;:-]$/);
      if (punctuation) {
        const pauseType = punctuation[0] as keyof typeof this.PUNCTUATION_PAUSES;
        wordDuration += this.PUNCTUATION_PAUSES[pauseType] || 0.2;
      }
      
      // Ajuste por posición en la oración
      if (index === 0) wordDuration += 0.1; // Pausa inicial
      
      wordTimings.push({
        word,
        startTime: currentTime,
        endTime: currentTime + wordDuration,
        syllables,
        difficulty
      });
      
      currentTime += wordDuration;
    });
    
    // Normalizar tiempos para coincidir con la duración real del audio
    const totalEstimatedTime = wordTimings[wordTimings.length - 1]?.endTime || 1;
    const scaleFactor = audioDuration / totalEstimatedTime;
    
    // Aplicar factor de escala con suavizado mejorado
    wordTimings.forEach((timing, index) => {
      // Aplicar un factor de suavizado más suave
      const position = index / (wordTimings.length - 1);
      const smoothingFactor = 0.98 + (Math.sin(position * Math.PI) * 0.04);
      
      // Ajuste adicional para palabras con puntuación
      const punctuationAdjustment = /[.!?]$/.test(timing.word) ? 0.95 : 1;
      
      const adjustedScale = scaleFactor * smoothingFactor * punctuationAdjustment;
      
      timing.startTime *= adjustedScale;
      timing.endTime *= adjustedScale;
    });
    
    return wordTimings;
  }

  static createDynamicTracker(wordTimings: WordTiming[], language: string, originalText: string): {
    getCurrentWordIndex: (currentTime: number) => number;
    adjustTiming: (currentWordIndex: number, actualTime: number) => void;
    getNextExpectedTime: (wordIndex: number) => number;
    recordFeedback: (wordIndex: number, expectedTime: number, actualTime: number) => void;
  } {
    let timingAdjustments: Map<number, number> = new Map();
    
    return {
      getCurrentWordIndex(currentTime: number): number {
        for (let i = 0; i < wordTimings.length; i++) {
          const adjustment = timingAdjustments.get(i) || 0;
          const adjustedStartTime = wordTimings[i].startTime + adjustment;
          const adjustedEndTime = wordTimings[i].endTime + adjustment;
          
          if (currentTime >= adjustedStartTime && currentTime <= adjustedEndTime) {
            return i;
          }
        }
        
        // Si no encuentra coincidencia exacta, usar interpolación
        for (let i = 0; i < wordTimings.length - 1; i++) {
          const adjustment = timingAdjustments.get(i) || 0;
          if (currentTime >= wordTimings[i].startTime + adjustment && 
              currentTime < wordTimings[i + 1].startTime + adjustment) {
            return i;
          }
        }
        
        return Math.min(wordTimings.length - 1, 
               Math.max(0, Math.floor((currentTime / wordTimings[wordTimings.length - 1].endTime) * wordTimings.length)));
      },
      
      adjustTiming(currentWordIndex: number, actualTime: number): void {
        if (currentWordIndex < wordTimings.length) {
          const expectedTime = wordTimings[currentWordIndex].startTime;
          const drift = actualTime - expectedTime;
          
          // Solo aplicar corrección si el drift es significativo (>0.2 segundos)
          if (Math.abs(drift) > 0.2) {
            // Aplicar corrección gradual más suave
            const correctionStrength = 0.2;
            const lookAhead = Math.min(8, wordTimings.length - currentWordIndex);
            
            for (let i = currentWordIndex; i < currentWordIndex + lookAhead; i++) {
              const distance = i - currentWordIndex;
              const decay = Math.exp(-distance * 0.4);
              const correction = drift * correctionStrength * decay;
              
              // Suavizar la corrección con el ajuste anterior
              const previousAdjustment = timingAdjustments.get(i) || 0;
              const smoothedCorrection = previousAdjustment * 0.3 + correction * 0.7;
              
              timingAdjustments.set(i, smoothedCorrection);
            }
          }
        }
      },
      
      getNextExpectedTime(wordIndex: number): number {
        if (wordIndex < wordTimings.length) {
          const adjustment = timingAdjustments.get(wordIndex) || 0;
          return wordTimings[wordIndex].startTime + adjustment;
        }
        return 0;
      },

      recordFeedback(wordIndex: number, expectedTime: number, actualTime: number): void {
        // Registrar feedback para el servicio adaptativo
        AdaptiveTimingService.recordTimingFeedback({
          expectedTime,
          actualTime,
          wordIndex,
          textLength: originalText.length,
          language
        });
      }
    };
  }
}