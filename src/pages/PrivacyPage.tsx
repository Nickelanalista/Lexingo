import React from 'react';
import { Shield } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
// Import Markdown as raw text using Vite's ?raw
// Path is relative to this file inside src/pages
// Spanish Privacy Policy
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will resolve ?raw at build time
import privacyContent from '../../metadata/politica-privacidad.md?raw';

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pb-24">
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Política de Privacidad
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Última actualización: 13/09/2025 · Ñuñoa, Chile
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <MarkdownRenderer content={privacyContent as unknown as string} />
        </div>
      </div>
    </div>
  );
}
