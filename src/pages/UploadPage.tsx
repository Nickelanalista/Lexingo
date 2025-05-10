import React from 'react';
import { Book, Upload } from 'lucide-react';
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

        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium text-white flex items-center">
            <Book className="h-5 w-5 mr-2 text-purple-400" />
            Formatos soportados
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { format: 'PDF', ext: '.pdf' },
              { format: 'Texto', ext: '.txt' },
              { format: 'Word', ext: '.docx' },
              { format: 'Markdown', ext: '.md' },
              { format: 'HTML', ext: '.html' },
              { format: 'RTF', ext: '.rtf' }
            ].map((item) => (
              <div key={item.ext} className="bg-gray-700/50 rounded p-3">
                <p className="text-white font-medium">{item.format}</p>
                <p className="text-gray-400 text-sm">{item.ext}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}