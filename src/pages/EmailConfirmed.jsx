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
    console.log('🔍 EmailConfirmed component mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()));
    
    // Evitar múltiples ejecuciones
    let isCancelled = false;
    
    const runConfirmation = async () => {
      if (!isCancelled) {
        await confirmEmail();
      }
    };
    
    runConfirmation();
    
    return () => {
      isCancelled = true;
    };
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
        setStatus('error');
        setErrorMessage(
          error.message.includes('expired')
            ? 'El enlace de confirmación ha expirado. Por favor, solicita un nuevo email de verificación desde la app.'
            : 'No pudimos verificar tu email. Por favor, intenta nuevamente.'
        );
        return;
      }

      console.log('✅ Email confirmado exitosamente:', data);
      setUserEmail(data.user?.email || '');
      
      // Cerrar sesión en la web app (solo queremos que esté logueado en la app móvil)
      await supabase.auth.signOut();
      console.log('🚪 Sesión cerrada en web app');
      
      setStatus('success');

      // Iniciar countdown para redirect automático
      startCountdown();

    } catch (error) {
      console.error('❌ Error inesperado:', error);
      setStatus('error');
      setErrorMessage('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
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

  const redirectToApp = () => {
    // Intentar abrir la app con deep link
    window.location.href = 'lexingo://auth/callback';

    // Fallback: Si no se abre la app en 3 segundos, mostrar instrucciones
    setTimeout(() => {
      alert('Si la app no se abrió automáticamente, ábrela manualmente desde tu teléfono.');
    }, 3000);
  };

  return (
    <div style={styles.container}>
      {/* Debug indicator - Remove this after testing */}
      <div style={{ position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', padding: '10px', zIndex: 9999 }}>
        EmailConfirmed Component Loaded ✅
      </div>
      
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
            <h1 style={styles.title}>¡Email confirmado!</h1>
            <p style={styles.subtitle}>
              {userEmail && `Tu cuenta (${userEmail}) ha sido verificada exitosamente.`}
              {!userEmail && 'Tu cuenta ha sido verificada exitosamente.'}
            </p>
            <div style={styles.countdownContainer}>
              <p style={styles.countdown}>
                Redirigiendo a la app en <strong>{countdown}</strong> segundos...
              </p>
            </div>
            <button onClick={redirectToApp} style={styles.button}>
              Abrir Lexingo AI ahora
            </button>
            <p style={styles.hint}>
              💡 Si la app no se abre automáticamente, haz clic en el botón de arriba
            </p>
          </>
        )}

        {/* ESTADO: Error */}
        {status === 'error' && (
          <>
            <div style={styles.iconError}>❌</div>
            <h1 style={styles.title}>No se pudo verificar</h1>
            <p style={styles.subtitle}>{errorMessage}</p>
            <button onClick={redirectToApp} style={styles.buttonSecondary}>
              Volver a la app
            </button>
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
