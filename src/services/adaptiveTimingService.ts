export interface TimingCalibration {
  language: string;
  avgSpeechRateAdjustment: number;
  syllableDurationMultiplier: number;
  punctuationPauseMultiplier: number;
  sampleSize: number;
  confidence: number;
}

interface TimingFeedback {
  expectedTime: number;
  actualTime: number;
  wordIndex: number;
  textLength: number;
  language: string;
}

export class AdaptiveTimingService {
  private static calibrations: Map<string, TimingCalibration> = new Map();
  private static feedbackBuffer: TimingFeedback[] = [];
  private static readonly MAX_FEEDBACK_BUFFER = 50;
  private static readonly MIN_SAMPLES_FOR_CALIBRATION = 10;

  // Registrar feedback de timing para calibración
  static recordTimingFeedback(feedback: TimingFeedback) {
    this.feedbackBuffer.push(feedback);
    
    // Mantener buffer limitado
    if (this.feedbackBuffer.length > this.MAX_FEEDBACK_BUFFER) {
      this.feedbackBuffer.shift();
    }

    // Intentar calibrar si tenemos suficientes muestras
    const languageFeedback = this.feedbackBuffer.filter(f => f.language === feedback.language);
    if (languageFeedback.length >= this.MIN_SAMPLES_FOR_CALIBRATION) {
      this.updateCalibration(feedback.language);
    }
  }

  // Actualizar calibración para un idioma específico
  private static updateCalibration(language: string) {
    const languageFeedback = this.feedbackBuffer.filter(f => f.language === language);
    
    if (languageFeedback.length < this.MIN_SAMPLES_FOR_CALIBRATION) {
      return;
    }

    // Calcular métricas de desviación
    let totalSpeechRateError = 0;
    let totalPauseError = 0;
    let validSamples = 0;

    languageFeedback.forEach(feedback => {
      const timeDiff = feedback.actualTime - feedback.expectedTime;
      const relativeError = timeDiff / Math.max(feedback.expectedTime, 0.1);
      
      // Filtrar outliers (errores > 100%)
      if (Math.abs(relativeError) <= 1.0) {
        totalSpeechRateError += relativeError;
        validSamples++;
      }
    });

    if (validSamples < 3) return; // No hay suficientes muestras válidas

    const avgSpeechRateError = totalSpeechRateError / validSamples;
    
    // Calcular confianza basada en consistencia
    const variance = languageFeedback.reduce((acc, feedback) => {
      const timeDiff = feedback.actualTime - feedback.expectedTime;
      const relativeError = timeDiff / Math.max(feedback.expectedTime, 0.1);
      return acc + Math.pow(relativeError - avgSpeechRateError, 2);
    }, 0) / validSamples;
    
    const confidence = Math.max(0.1, Math.min(0.9, 1 - Math.sqrt(variance)));

    // Actualizar o crear calibración
    const existingCalibration = this.calibrations.get(language);
    
    if (existingCalibration) {
      // Promedio ponderado con calibración existente
      const newWeight = 0.3; // Dar más peso a datos históricos
      const calibration: TimingCalibration = {
        language,
        avgSpeechRateAdjustment: existingCalibration.avgSpeechRateAdjustment * (1 - newWeight) + 
                                avgSpeechRateError * newWeight,
        syllableDurationMultiplier: Math.max(0.7, Math.min(1.3, 1 + avgSpeechRateError * 0.5)),
        punctuationPauseMultiplier: Math.max(0.8, Math.min(1.2, 1 + avgSpeechRateError * 0.2)),
        sampleSize: existingCalibration.sampleSize + validSamples,
        confidence: Math.min(0.9, (existingCalibration.confidence + confidence) / 2)
      };
      
      this.calibrations.set(language, calibration);
    } else {
      // Crear nueva calibración
      const calibration: TimingCalibration = {
        language,
        avgSpeechRateAdjustment: avgSpeechRateError,
        syllableDurationMultiplier: Math.max(0.7, Math.min(1.3, 1 + avgSpeechRateError * 0.5)),
        punctuationPauseMultiplier: Math.max(0.8, Math.min(1.2, 1 + avgSpeechRateError * 0.2)),
        sampleSize: validSamples,
        confidence
      };
      
      this.calibrations.set(language, calibration);
    }

    console.log(`[AdaptiveTimingService] Calibración actualizada para ${language}:`, this.calibrations.get(language));
  }

  // Obtener calibración para un idioma
  static getCalibration(language: string): TimingCalibration | null {
    return this.calibrations.get(language) || null;
  }

  // Aplicar calibración a una tasa de habla base
  static adjustSpeechRate(baseSpeechRate: number, language: string): number {
    const calibration = this.calibrations.get(language);
    
    if (!calibration || calibration.confidence < 0.3) {
      return baseSpeechRate;
    }

    // Aplicar ajuste con factor de confianza
    const adjustment = calibration.avgSpeechRateAdjustment * calibration.confidence;
    return baseSpeechRate * (1 - adjustment * 0.3); // Limitar el impacto del ajuste
  }

  // Aplicar calibración a duración de sílaba
  static adjustSyllableDuration(baseDuration: number, language: string): number {
    const calibration = this.calibrations.get(language);
    
    if (!calibration || calibration.confidence < 0.3) {
      return baseDuration;
    }

    return baseDuration * calibration.syllableDurationMultiplier;
  }

  // Aplicar calibración a pausas de puntuación
  static adjustPunctuationPause(basePause: number, language: string): number {
    const calibration = this.calibrations.get(language);
    
    if (!calibration || calibration.confidence < 0.3) {
      return basePause;
    }

    return basePause * calibration.punctuationPauseMultiplier;
  }

  // Obtener estadísticas de calibración
  static getCalibrationStats(): { [language: string]: TimingCalibration } {
    const stats: { [language: string]: TimingCalibration } = {};
    
    this.calibrations.forEach((calibration, language) => {
      stats[language] = { ...calibration };
    });

    return stats;
  }

  // Limpiar datos de calibración (útil para testing o reset)
  static clearCalibration(language?: string) {
    if (language) {
      this.calibrations.delete(language);
      this.feedbackBuffer = this.feedbackBuffer.filter(f => f.language !== language);
    } else {
      this.calibrations.clear();
      this.feedbackBuffer = [];
    }
  }

  // Exportar calibraciones para persistencia
  static exportCalibrations(): string {
    const data = {
      calibrations: Object.fromEntries(this.calibrations),
      timestamp: Date.now()
    };
    
    return JSON.stringify(data);
  }

  // Importar calibraciones desde persistencia
  static importCalibrations(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.calibrations && typeof parsed.calibrations === 'object') {
        this.calibrations.clear();
        
        Object.entries(parsed.calibrations).forEach(([language, calibration]) => {
          if (this.isValidCalibration(calibration)) {
            this.calibrations.set(language, calibration as TimingCalibration);
          }
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AdaptiveTimingService] Error importando calibraciones:', error);
      return false;
    }
  }

  // Validar estructura de calibración
  private static isValidCalibration(calibration: any): boolean {
    return (
      calibration &&
      typeof calibration.language === 'string' &&
      typeof calibration.avgSpeechRateAdjustment === 'number' &&
      typeof calibration.syllableDurationMultiplier === 'number' &&
      typeof calibration.punctuationPauseMultiplier === 'number' &&
      typeof calibration.sampleSize === 'number' &&
      typeof calibration.confidence === 'number' &&
      calibration.sampleSize > 0 &&
      calibration.confidence >= 0 &&
      calibration.confidence <= 1
    );
  }
}