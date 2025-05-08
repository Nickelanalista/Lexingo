import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload } from 'lucide-react';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { useBookContext } from '../context/BookContext';

interface PDFUploaderProps {
  onFileProcessed: () => void;
}

// Lista de tipos MIME y extensiones soportadas
const SUPPORTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/rtf': ['.rtf'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
};

const FileUploader: React.FC<PDFUploaderProps> = ({ onFileProcessed }) => {
  const { processFile, error } = useFileProcessor();
  const { isLoading } = useBookContext();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const result = await processFile(file);
      if (result) {
        onFileProcessed();
      }
    }
  }, [processFile, onFileProcessed]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxFiles: 1,
    multiple: false
  });

  // Lista de formatos soportados para mostrar
  const supportedFormatsText = 'PDF, TXT, DOCX, DOC, RTF, MD, HTML';

  return (
    <div className="w-full max-w-xl mx-auto py-12 px-4">
      <div 
        className={`
          w-full p-8 rounded-xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center text-center
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
          ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400'}
          dark:bg-gray-800 bg-white
        `}
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={isLoading} />
        
        <div className="mb-4">
          {isLoading ? (
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            isDragReject ? (
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30">
                <FileText size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30">
                <Upload size={32} />
              </div>
            )
          )}
        </div>
        
        <h3 className="text-lg font-medium mb-2 dark:text-white">
          {isLoading ? 'Procesando archivo...' : 'Sube tu libro'}
        </h3>
        
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {isDragActive 
            ? 'Suelta el archivo aquí...' 
            : isDragReject 
              ? `Solo se aceptan archivos ${supportedFormatsText}`
              : `Arrastra y suelta un archivo (${supportedFormatsText}), o haz clic para seleccionar`}
        </p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {!isLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Tu archivo será procesado localmente - no se subirá a ningún servidor.
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUploader;