export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'webp' | 'jpeg' | 'png';
  maxSizeKB?: number; // Maximum size in KB
}

export class ImageOptimizationService {
  private static readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.8,
    format: 'webp',
    maxSizeKB: 100
  };

  /**
   * Optimiza una imagen redimensionándola y comprimiéndola
   */
  static async optimizeImage(
    file: File, 
    options: ImageOptimizationOptions = {}
  ): Promise<{ optimizedFile: File; originalSize: number; optimizedSize: number }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones manteniendo aspect ratio
          const { width: newWidth, height: newHeight } = this.calculateDimensions(
            img.width, 
            img.height, 
            opts.maxWidth, 
            opts.maxHeight
          );

          // Configurar canvas
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Aplicar filtros de calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convertir a blob con el formato y calidad especificados
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al crear la imagen optimizada'));
                return;
              }

              const originalSize = file.size;
              let finalBlob = blob;

              // Si el archivo optimizado sigue siendo muy grande, reducir más la calidad
              if (blob.size > opts.maxSizeKB * 1024 && opts.quality > 0.3) {
                const lowerQuality = Math.max(0.3, opts.quality - 0.2);
                canvas.toBlob(
                  (lowerQualityBlob) => {
                    if (lowerQualityBlob) {
                      finalBlob = lowerQualityBlob;
                    }

                    // Crear archivo final
                    const optimizedFile = new File(
                      [finalBlob],
                      this.generateOptimizedFileName(file.name, opts.format),
                      { 
                        type: this.getMimeType(opts.format),
                        lastModified: Date.now()
                      }
                    );

                    resolve({
                      optimizedFile,
                      originalSize,
                      optimizedSize: optimizedFile.size
                    });
                  },
                  this.getMimeType(opts.format),
                  lowerQuality
                );
              } else {
                // Crear archivo final
                const optimizedFile = new File(
                  [finalBlob],
                  this.generateOptimizedFileName(file.name, opts.format),
                  { 
                    type: this.getMimeType(opts.format),
                    lastModified: Date.now()
                  }
                );

                resolve({
                  optimizedFile,
                  originalSize,
                  optimizedSize: optimizedFile.size
                });
              }
            },
            this.getMimeType(opts.format),
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      // Cargar la imagen
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calcula las nuevas dimensiones manteniendo el aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Calcular ratio de redimensionamiento
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    // Solo redimensionar si la imagen es más grande que los límites
    if (ratio < 1) {
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  }

  /**
   * Genera un nombre de archivo optimizado
   */
  private static generateOptimizedFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
    return `${nameWithoutExt}_optimized.${format}`;
  }

  /**
   * Obtiene el MIME type basado en el formato
   */
  private static getMimeType(format: string): string {
    switch (format) {
      case 'webp':
        return 'image/webp';
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'image/webp';
    }
  }

  /**
   * Valida si el archivo es una imagen válida
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Verificar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'El archivo debe ser una imagen' };
    }

    // Verificar tamaño máximo (20MB para el original)
    const maxOriginalSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxOriginalSize) {
      return { valid: false, error: 'La imagen no debe superar 20MB' };
    }

    // Verificar tipos soportados
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, error: 'Formato de imagen no soportado. Use JPG, PNG, WebP o GIF.' };
    }

    return { valid: true };
  }

  /**
   * Obtiene información detallada de una imagen
   */
  static async getImageInfo(file: File): Promise<{
    width: number;
    height: number;
    size: number;
    format: string;
    aspectRatio: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          format: file.type,
          aspectRatio: img.width / img.height
        });
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen para analizar'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Formatea el tamaño de archivo para mostrar al usuario
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Calcula el porcentaje de reducción de tamaño
   */
  static calculateReduction(originalSize: number, optimizedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - optimizedSize) / originalSize) * 100);
  }
}