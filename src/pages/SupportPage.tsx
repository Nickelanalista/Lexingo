import React from 'react';
import { Mail, MessageCircle, Book, HelpCircle, ExternalLink } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 pb-24">
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Soporte y Ayuda
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Estamos aquí para ayudarte con cualquier pregunta o problema que tengas con Lexingo AI
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Support */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-white">Contacto Directo</h2>
          </div>
          <p className="text-gray-300 dark:text-gray-300 mb-4">
            ¿Tienes algún problema técnico o pregunta específica? Contáctanos directamente.
          </p>
          <a
            href="mailto:lexingoai@gmail.com"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            lexingoai@gmail.com
          </a>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-white">Preguntas Frecuentes</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-white dark:text-white">¿Cómo subo un libro?</h3>
              <p className="text-sm text-gray-300 dark:text-gray-300">
                Ve a la sección "Subir" y selecciona un archivo PDF, EPUB o TXT desde tu dispositivo.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white dark:text-white">¿Qué idiomas soporta?</h3>
              <p className="text-sm text-gray-300 dark:text-gray-300">
                Lexingo AI soporta más de 100 idiomas para traducción y lectura.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white dark:text-white">¿Es gratuito?</h3>
              <p className="text-sm text-gray-300 dark:text-gray-300">
                Ofrecemos un plan gratuito con funciones básicas y planes premium con características avanzadas.
              </p>
            </div>
          </div>
        </div>

        {/* Features Guide */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Book className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-white">Guía de Funciones</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-white">Traducción Instantánea</p>
                <p className="text-sm text-gray-300 dark:text-gray-300">Toca cualquier palabra para obtener su traducción</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-white">Modo Audio</p>
                <p className="text-sm text-gray-300 dark:text-gray-300">Escucha tus libros con narración de IA</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-white">Progreso de Lectura</p>
                <p className="text-sm text-gray-300 dark:text-gray-300">Guarda automáticamente tu progreso de lectura</p>
              </div>
            </div>
          </div>
        </div>

        {/* Community */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-white">Comunidad</h2>
          </div>
          <p className="text-gray-300 dark:text-gray-300 mb-4">
            Únete a nuestra comunidad para compartir consejos y obtener ayuda de otros usuarios.
          </p>
          <div className="space-y-2">
            <a
              href="https://github.com/lexingo/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Discusiones en GitHub
            </a>
            <a
              href="https://discord.gg/lexingo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Servidor de Discord
            </a>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Estado del Sistema</h2>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-white dark:text-white">Todos los servicios funcionan correctamente</span>
        </div>
        <p className="text-sm text-gray-300 dark:text-gray-300 mt-2">
          Última verificación: Hoy a las {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* App Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Información de la App</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-300 dark:text-gray-300">Versión</p>
            <p className="font-medium text-white">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-300 dark:text-gray-300">Desarrollador</p>
            <p className="font-medium text-white">Coliseo Digital</p>
          </div>
          <div>
            <p className="text-sm text-gray-300 dark:text-gray-300">Compatibilidad</p>
            <p className="font-medium text-white">iOS 14.0+</p>
          </div>
        </div>
      </div>
    </div>
  );
}