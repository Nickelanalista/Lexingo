import React from 'react';
import { Upload } from 'lucide-react';
import FileUploader from '../components/PDFUploader';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-900/30 rounded-full mb-4">
            <Upload className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Subir nuevo libro
          </h1>
          <p className="text-gray-400">
            Sube tus documentos en PDF, TXT, DOCX y más formatos
          </p>
        </div>

        <FileUploader onFileProcessed={() => {}} />
      </div>
    </div>
  );
}