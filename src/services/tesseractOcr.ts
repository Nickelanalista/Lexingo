import * as Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Inicializar PDF.js worker si no está ya inicializado
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

// Tipos para los callbacks de procesamiento progresivo
export type ProcessPageCallback = (pageNumber: number, text: string) => void;
export type ProgressCallback = (progress: number, totalPages: number) => void;

/**
 * Servicio para procesar documentos mediante OCR utilizando Tesseract.js
 */
export const tesseractOcrService = {
  /**
   * Procesa un documento PDF o imagen para extraer texto mediante OCR
   * Versión estándar que devuelve todo el texto al finalizar
   * @param file Archivo a procesar (PDF o imagen)
   * @returns Texto extraído del documento
   */
  async processFile(file: File): Promise<string> {
    try {
      console.log('Procesando archivo para OCR con Tesseract.js:', file.name, 'tamaño:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
      
      // Determinar el tipo de contenido
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        throw new Error('Formato no soportado para OCR. Solo se admiten imágenes y PDFs.');
      }

      // Si el archivo es una imagen, procesarla directamente con Tesseract
      if (isImage) {
        return this.processImage(file);
      }
      
      // Si es un PDF, extraer las imágenes de las páginas y procesarlas con Tesseract
      if (isPdf) {
        return this.processPdfPages(file);
      }
      
      throw new Error('Tipo de archivo no soportado para OCR');
    } catch (error: any) {
      console.error('Error en OCR con Tesseract:', error);
      throw error;
    }
  },

  /**
   * Versión progresiva que procesa páginas en segundo plano y notifica a través de callbacks
   * @param file Archivo a procesar
   * @param onPageProcessed Callback cuando una página es procesada
   * @param onProgress Callback para actualizar el progreso
   */
  async processFileProgressively(
    file: File, 
    onPageProcessed: ProcessPageCallback,
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      console.log('Iniciando procesamiento OCR progresivo con Tesseract.js:', file.name);
      
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        throw new Error('Formato no soportado para OCR. Solo se admiten imágenes y PDFs.');
      }

      // Si el archivo es una imagen, procesarla y notificar
      if (isImage) {
        onProgress(0, 1);
        const text = await this.processImage(file);
        onPageProcessed(1, text);
        onProgress(1, 1);
        return;
      }
      
      // Si es un PDF, procesarlo por lotes
      if (isPdf) {
        await this.processPdfPagesProgressively(file, onPageProcessed, onProgress);
        return;
      }
    } catch (error: any) {
      console.error('Error en OCR progresivo con Tesseract:', error);
      throw error;
    }
  },
  
  /**
   * Procesa una imagen con Tesseract OCR
   */
  async processImage(file: File): Promise<string> {
    try {
      console.log('Procesando imagen con Tesseract OCR...');
      
      // Crear una URL para la imagen
      const imageUrl = URL.createObjectURL(file);
      
      // Ejecutar Tesseract OCR en español - se puede cambiar el idioma según necesidad
      const result = await Tesseract.recognize(
        imageUrl,
        'spa', // 'spa' para español, 'eng' para inglés, etc.
        {
          logger: message => {
            if (message.status === 'recognizing text') {
              console.log(`Progreso OCR: ${(message.progress * 100).toFixed(2)}%`);
            }
          }
        }
      );
      
      // Liberar la URL creada
      URL.revokeObjectURL(imageUrl);
      
      return result.data.text || '';
    } catch (error) {
      console.error('Error en el procesamiento de imagen con Tesseract:', error);
      throw error;
    }
  },
  
  /**
   * Procesa las páginas de un PDF, extrayendo las imágenes y aplicando OCR
   */
  async processPdfPages(file: File): Promise<string> {
    try {
      console.log('Procesando PDF para OCR...');
      
      // Leer el archivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Cargar el documento PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      let allText = '';
      
      // Procesar cada página del PDF
      for (let i = 1; i <= totalPages; i++) {
        console.log(`Procesando página ${i} de ${totalPages}`);
        const page = await pdf.getPage(i);
        
        // Renderizar la página como una imagen
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convertir canvas a blob
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
        
        // Crear un objeto File a partir del Blob para procesamiento OCR
        const imageFile = new File([imageBlob], `page-${i}.png`, { type: 'image/png' });
        
        // Procesar la imagen con Tesseract
        const pageText = await this.processImage(imageFile);
        
        // Agregar el texto de la página al texto acumulado
        allText += pageText + '\n\n';
      }
      
      return allText;
    } catch (error) {
      console.error('Error al procesar las páginas del PDF:', error);
      throw error;
    }
  },

  /**
   * Procesa las páginas de un PDF progresivamente, notificando cada página procesada
   * @param file Archivo PDF
   * @param onPageProcessed Callback cuando una página es procesada
   * @param onProgress Callback para actualizar progreso
   */
  async processPdfPagesProgressively(
    file: File,
    onPageProcessed: ProcessPageCallback,
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      console.log('Iniciando procesamiento progresivo del PDF para OCR...');
      
      // Leer el archivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Cargar el documento PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      
      // Notificar inicio con 0% de progreso
      onProgress(0, totalPages);
      
      // Tamaño del lote (procesar estas páginas en cada ciclo)
      // En dispositivos móviles, usar un valor más pequeño
      const batchSize = this.isMobileDevice() ? 2 : 5;
      
      // Procesar páginas en lotes
      for (let i = 1; i <= totalPages; i += batchSize) {
        const batch = [];
        
        // Preparar el lote actual
        for (let j = 0; j < batchSize && i + j <= totalPages; j++) {
          batch.push(i + j);
        }
        
        // Procesar el lote actual en paralelo
        await Promise.all(batch.map(async (pageNum) => {
          try {
            console.log(`Procesando página ${pageNum} de ${totalPages}`);
            const page = await pdf.getPage(pageNum);
            
            // Renderizar la página como una imagen
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Usar una resolución más baja para dispositivos móviles
            if (this.isMobileDevice()) {
              const scale = 0.7;  // 70% de la resolución original
              const scaledCanvas = document.createElement('canvas');
              const scaledContext = scaledCanvas.getContext('2d');
              
              scaledCanvas.width = canvas.width * scale;
              scaledCanvas.height = canvas.height * scale;
              
              scaledContext.drawImage(
                canvas, 
                0, 0, canvas.width, canvas.height,
                0, 0, scaledCanvas.width, scaledCanvas.height
              );
              
              canvas.width = scaledCanvas.width;
              canvas.height = scaledCanvas.height;
              context.drawImage(scaledCanvas, 0, 0);
            }
            
            // Convertir canvas a blob
            const imageBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => resolve(blob), 'image/png', 0.7); // Usar compresión 0.7
            });
            
            // Crear un objeto File a partir del Blob para procesamiento OCR
            const imageFile = new File([imageBlob], `page-${pageNum}.png`, { type: 'image/png' });
            
            // Procesar la imagen con Tesseract
            const pageText = await this.processImage(imageFile);
            
            // Notificar que esta página está lista
            onPageProcessed(pageNum, pageText);
            
            // Actualizar progreso
            onProgress(pageNum, totalPages);
          } catch (pageError) {
            console.error(`Error procesando página ${pageNum}:`, pageError);
            // Notificar página con error, pero con mensaje de error como contenido
            onPageProcessed(pageNum, `[Error OCR en página ${pageNum}]`);
          }
        }));
        
        // Pequeña pausa entre lotes para evitar saturar el dispositivo
        if (i + batchSize <= totalPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error al procesar las páginas del PDF progresivamente:', error);
      throw error;
    }
  },
  
  /**
   * Detecta si el usuario está en un dispositivo móvil
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  /**
   * Convierte un archivo a base64 (utilidad)
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Eliminar el prefijo "data:application/pdf;base64," o similar
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Error al convertir archivo a base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }
}; 