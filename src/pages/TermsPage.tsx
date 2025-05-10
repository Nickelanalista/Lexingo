import React from 'react';
import { Book, Shield } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">
            Términos y Condiciones
          </h1>
          <p className="text-gray-400">
            Última actualización: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              1. Aceptación de los términos
            </h2>
            <p className="text-gray-300">
              Al acceder y utilizar Lexingo, aceptas estar sujeto a estos términos y condiciones.
              Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar nuestros servicios.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              2. Uso del servicio
            </h2>
            <p className="text-gray-300">
              Lexingo es una plataforma de lectura y traducción. Te comprometes a:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-4">
              <li>No usar el servicio para fines ilegales</li>
              <li>No compartir contenido protegido por derechos de autor sin autorización</li>
              <li>No intentar dañar o interrumpir el servicio</li>
              <li>Mantener la seguridad de tu cuenta</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              3. Privacidad y datos
            </h2>
            <p className="text-gray-300">
              Nos comprometemos a proteger tu privacidad. Al usar Lexingo:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-4">
              <li>Aceptas nuestra política de privacidad</li>
              <li>Nos autorizas a procesar tus datos según lo establecido</li>
              <li>Entiendes que tus datos se almacenan de forma segura</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              4. Contenido del usuario
            </h2>
            <p className="text-gray-300">
              Al subir contenido a Lexingo:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-4">
              <li>Garantizas tener los derechos necesarios</li>
              <li>Mantienes la propiedad de tu contenido</li>
              <li>Nos otorgas licencia para procesarlo y mostrarlo</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              5. Limitación de responsabilidad
            </h2>
            <p className="text-gray-300">
              Lexingo se proporciona "tal cual" y no garantizamos:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-4">
              <li>La precisión absoluta de las traducciones</li>
              <li>La disponibilidad ininterrumpida del servicio</li>
              <li>La ausencia total de errores</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}