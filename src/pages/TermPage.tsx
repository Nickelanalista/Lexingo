import React from 'react';
import { FileText } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
// Import Markdown as raw text using Vite's ?raw
// Spanish Terms and Conditions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will resolve ?raw at build time
import termsContent from '../../metadata/terminos-condiciones.md?raw';

export default function TermPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pb-24">
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Términos y Condiciones
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Última actualización: 13/09/2025 · Ñuñoa, Chile
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <MarkdownRenderer content={termsContent as unknown as string} />
        </div>
      </div>
    </div>
  );
}
