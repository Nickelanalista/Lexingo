import React, { useCallback, useState } from 'react';
import { Upload, FileText, File, Image } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { useBookContext } from '../context/BookContext';
import { useNavigate } from 'react-router-dom';
import MinimalLoadingIndicator from '../components/MinimalLoadingIndicator';

export default function UploadPage() {
  const [processingFile, setProcessingFile] = useState(false);
  const { processFile } = useFileProcessor();
  const { loadBookAndSkipEmptyPages } = useBookContext();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setProcessingFile(true);
      const book = await processFile(file);
      if (book) {
        loadBookAndSkipEmptyPages(book);
        navigate('/reader');
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
    } finally {
      setProcessingFile(false);
    }
  }, [processFile, loadBookAndSkipEmptyPages, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: false,
    disabled: processingFile
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-lg mx-auto space-y-8">
        
        {/* Título y subtítulo centrados */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Subir Documento
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Convierte tu documento en una experiencia de lectura inteligente
          </p>
        </div>

        {/* Formatos soportados - una sola fila */}
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">PDF</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <File className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">DOCX</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">TXT</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Image className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">IMG</span>
          </div>
        </div>

        {/* Área de drag and drop simplificada */}
        <div 
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive 
              ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
            }
            ${processingFile ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} disabled={processingFile} />
          
          {processingFile ? (
            <MinimalLoadingIndicator 
              message="Procesando" 
              size="medium" 
              showMessage={true} 
            />
          ) : (
            <>
              {/* Ícono circular de upload */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4 shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              
              {/* Texto simple */}
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isDragActive ? 'Suelta tu archivo aquí' : 'Arrastra tu documento'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                o haz clic para seleccionar
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}