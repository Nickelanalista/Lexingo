import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ============== COMPONENTE PRINCIPAL ==============
export default function EmailConfirmed() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setErrorMessage('No se encontró el token de confirmación en la URL.');
      return;
    }

    // Verificar si este token ya fue procesado (usando sessionStorage)
    const tokenKey = `email_confirmed_${token}`;
    const alreadyProcessed = sessionStorage.getItem(tokenKey);
    
    console.log('🔍 Verificando token:', {
      token: token.substring(0, 20) + '...',
      alreadyProcessed: alreadyProcessed ? 'SÍ' : 'NO',
      timestamp: new Date().toISOString()
    });

    if (alreadyProcessed) {
      console.log('⚠️ Este token ya fue procesado, cargando resultado guardado...');
      const savedResult = JSON.parse(alreadyProcessed);
      setStatus(savedResult.status);
      setUserEmail(savedResult.email || '');
      setErrorMessage(savedResult.error || '');
      
      if (savedResult.status === 'success') {
        startCountdown();
      }
      return;
    }

    // Marcar como "en proceso" para prevenir ejecuciones paralelas
    sessionStorage.setItem(tokenKey, JSON.stringify({ status: 'processing' }));
    
    console.log('✅ Primera ejecución de este token, procediendo con confirmación...');
    confirmEmail();
  }, [searchParams]);

  const confirmEmail = async () => {
    try {
      // Extraer parámetros de la URL
      const token = searchParams.get('token');
      const type = searchParams.get('type') || 'signup';

      console.log('📧 Confirmando email...', { token: token?.substring(0, 10), type });

      if (!token) {
        setStatus('error');
        setErrorMessage('No se encontró el token de confirmación en la URL.');
        return;
      }

      // Confirmar email con Supabase
      // Nota: Supabase usa 'signup' como tipo para confirmación de email
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) {
        console.error('❌ Error confirmando email:', error);
        const errorMsg = error.message.includes('expired')
          ? 'El enlace de confirmación ha expirado. Por favor, solicita un nuevo email de verificación desde la app.'
          : 'No pudimos verificar tu email. Por favor, intenta nuevamente.';
        
        // Guardar error en sessionStorage
        const tokenKey = `email_confirmed_${token}`;
        sessionStorage.setItem(tokenKey, JSON.stringify({
          status: 'error',
          error: errorMsg,
          timestamp: new Date().toISOString()
        }));
        
        setStatus('error');
        setErrorMessage(errorMsg);
        return;
      }

      console.log('✅ Email confirmado exitosamente:', data);
      const email = data.user?.email || '';
      setUserEmail(email);
      
      // Guardar resultado en sessionStorage para prevenir reconfirmaciones
      const tokenKey = `email_confirmed_${token}`;
      sessionStorage.setItem(tokenKey, JSON.stringify({
        status: 'success',
        email: email,
        timestamp: new Date().toISOString()
      }));
      
      // Cerrar sesión en la web app (solo queremos que esté logueado en la app móvil)
      await supabase.auth.signOut();
      console.log('🚪 Sesión cerrada en web app - Usuario NO queda logueado aquí');
      
      setStatus('success');

      // Iniciar countdown para redirect automático a la app
      startCountdown();

    } catch (error) {
      console.error('❌ Error inesperado:', error);
      const errorMsg = 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
      
      // Guardar error en sessionStorage
      const token = searchParams.get('token');
      if (token) {
        const tokenKey = `email_confirmed_${token}`;
        sessionStorage.setItem(tokenKey, JSON.stringify({
          status: 'error',
          error: errorMsg,
          timestamp: new Date().toISOString()
        }));
      }
      
      setStatus('error');
      setErrorMessage(errorMsg);
    }
  };

  const startCountdown = () => {
    let secondsLeft = 5;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        redirectToApp();
      }
    }, 1000);
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const redirectToApp = () => {
    // Solo intentar deep link si es un dispositivo móvil
    if (isMobileDevice()) {
      window.location.href = 'lexingo://auth/callback';
    }
    // Si es web, no hacer nada (el usuario debe abrir la app manualmente)
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* ESTADO: Verificando */}
        {status === 'verifying' && (
          <>
            <div style={styles.spinnerContainer}>
              <div style={styles.spinner} />
            </div>
            <h1 style={styles.title}>Verificando tu email...</h1>
            <p style={styles.subtitle}>Por favor espera un momento</p>
          </>
        )}

        {/* ESTADO: Éxito */}
        {status === 'success' && (
          <>
            <div style={styles.icon}>✅</div>
            <h1 style={styles.title}>¡Cuenta verificada!</h1>
            <p style={styles.subtitle}>
              {userEmail && `Tu cuenta (${userEmail}) ha sido verificada exitosamente.`}
              {!userEmail && 'Tu cuenta ha sido verificada exitosamente.'}
            </p>
            <p style={styles.subtitle}>
              <strong>Ya puedes iniciar sesión en la app móvil de Lexingo.</strong>
            </p>
            {isMobileDevice() && (
              <>
                <div style={styles.countdownContainer}>
                  <p style={styles.countdown}>
                    Intentando abrir la app en <strong>{countdown}</strong> segundos...
                  </p>
                </div>
                <button onClick={redirectToApp} style={styles.button}>
                  Abrir Lexingo AI ahora
                </button>
              </>
            )}
            {!isMobileDevice() && (
              <div style={styles.instructionBox}>
                <p style={styles.instructionText}>
                  📱 <strong>Abre la app de Lexingo en tu móvil</strong> e inicia sesión con tu correo y contraseña.
                </p>
              </div>
            )}
          </>
        )}

        {/* ESTADO: Error */}
        {status === 'error' && (
          <>
            <div style={styles.iconError}>❌</div>
            <h1 style={styles.title}>No se pudo verificar</h1>
            <p style={styles.subtitle}>{errorMessage}</p>
            {isMobileDevice() && (
              <button onClick={redirectToApp} style={styles.buttonSecondary}>
                Volver a la app
              </button>
            )}
            {!isMobileDevice() && (
              <p style={styles.subtitle}>
                📱 Abre la app de Lexingo en tu móvil para solicitar un nuevo email de verificación.
              </p>
            )}
            <p style={styles.hint}>
              Si necesitas ayuda, contacta a soporte desde la app
            </p>
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <a href="https://lexingo.netlify.app" style={styles.link}>
            ← Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

// ============== ESTILOS ==============
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F0F23 0%, #1a1a3e 50%, #2d2d5f 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '48px 32px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #8B5CF6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  icon: {
    fontSize: '72px',
    marginBottom: '24px',
    animation: 'bounce 0.6s ease-in-out',
  },
  iconError: {
    fontSize: '72px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: '16px',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  countdownContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  countdown: {
    fontSize: '16px',
    color: '#8B5CF6',
    fontWeight: '600',
    margin: 0,
  },
  button: {
    backgroundColor: '#8B5CF6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginBottom: '16px',
  },
  hint: {
    fontSize: '13px',
    color: '#9CA3AF',
    marginTop: '16px',
    lineHeight: '1.5',
  },
  instructionBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
    marginBottom: '16px',
    border: '2px solid rgba(139, 92, 246, 0.3)',
  },
  instructionText: {
    fontSize: '16px',
    color: '#1F2937',
    lineHeight: '1.6',
    margin: 0,
  },
  footer: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E5E7EB',
  },
  link: {
    color: '#8B5CF6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
};

// ============== CSS ANIMATIONS (Agregar a tu index.css o global.css) ==============
//
// @keyframes spin {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }
//
// @keyframes bounce {
//   0%, 100% { transform: scale(1); }
//   50% { transform: scale(1.1); }
// }
//
// /* Hover effects */
// button:hover {
//   transform: translateY(-2px);
//   box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
// }
//
// a:hover {
//   color: #06B6D4;
// }
// ==============================================================================
