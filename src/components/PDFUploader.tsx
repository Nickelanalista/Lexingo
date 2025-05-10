import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload } from 'lucide-react';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { useBookContext } from '../context/BookContext';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const result = await processFile(file);
      if (result) {
        navigate('/books');
      }
    }
  }, [processFile, navigate]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxFiles: 1,
    multiple: false
  });

  // Lista de formatos soportados para mostrar
  const supportedFormatsText = 'PDF, TXT, DOCX, DOC, RTF, MD, HTML';

  return (
    <div className="w-full mx-auto py-1">
      <div 
        className={`
          w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center text-center
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
          ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400'}
          dark:bg-gray-800 bg-white
        `}
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={isLoading} />
        
        <div className="mb-2">
          {isLoading ? (
            <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            isDragReject ? (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30">
                <FileText size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30">
                <Upload size={20} />
              </div>
            )
          )}
        </div>
        
        <h3 className="text-sm font-medium mb-1 dark:text-white">
          {isLoading ? 'Procesando archivo...' : 'Sube tu libro'}
        </h3>
        
        <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
          {isDragActive 
            ? 'Suelta el archivo aquí...' 
            : isDragReject 
              ? `Solo se aceptan archivos ${supportedFormatsText}`
              : `Arrastra y suelta un archivo (${supportedFormatsText}), o haz clic`}
        </p>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;