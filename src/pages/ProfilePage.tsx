import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Camera, Eye, EyeOff, Loader2, Key, RefreshCw, LogOut, AlertTriangle } from 'lucide-react';

// Evento personalizado para notificar actualización de avatar
export const AVATAR_UPDATED_EVENT = 'AVATAR_UPDATED';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    if (originalName !== '' && name !== originalName) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [name, originalName]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        // Get user metadata for name if not set in profile
        const userName = data.name || user.user_metadata?.name || '';
        
        setProfile(data);
        setName(userName);
        setOriginalName(userName);
        
        // Verificar si la URL del avatar existe y aplicar cache-busting
        if (data.avatar_url) {
          // Añadir timestamp para evitar problemas de caché
          const timestamp = new Date().getTime();
          setAvatarUrl(`${data.avatar_url}?t=${timestamp}`);
        } else {
          setAvatarUrl(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    try {
      setError(null);
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe superar 5MB');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor selecciona una imagen');
      }

      setUploadingAvatar(true);
      
      // Realizar la carga directamente al cambiar el archivo
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const fileExt = file.name.split('.').pop();
      // Modificamos el formato del nombre para que cumpla con la política RLS
      // Primero ponemos el ID del usuario, seguido de una barra y luego el resto del nombre
      // La política espera: user_id/cualquier_cosa.ext
      const fileName = `${user.id}/${Date.now()}_avatar.${fileExt}`;
      
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          // Extraer nombre del archivo con formato especial
          // La URL tendrá este formato: https://[base]/storage/v1/object/public/avatars/[user_id]/[timestamp]_avatar.[ext]
          const urlParts = profile.avatar_url.split('/');
          // Los últimos dos segmentos son user_id/filename.ext
          const userId = urlParts[urlParts.length - 2];
          const filename = urlParts[urlParts.length - 1].split('?')[0]; // Quitar parámetros de query
          
          const oldFilePath = `${userId}/${filename}`;
          console.log('Eliminando avatar anterior:', oldFilePath);
          
          const { error: removeError } = await supabase.storage
            .from('avatars')
            .remove([oldFilePath]);
            
          if (removeError) {
            console.warn('Error al eliminar avatar anterior:', removeError);
          } else {
            console.log('Avatar anterior eliminado correctamente');
          }
        } catch (err) {
          console.warn('Error capturado al eliminar avatar anterior:', err);
        }
      }

      // Upload new avatar with proper metadata
      try {
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { 
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Error al subir imagen:', uploadError);
          throw new Error('Error al subir imagen: ' + uploadError.message);
        }

        console.log('Avatar subido correctamente:', data);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('Public URL generada:', publicUrl);
        
        // Añadir timestamp para evitar problemas de caché
        const timestamp = new Date().getTime();
        const urlWithTimestamp = `${publicUrl}?t=${timestamp}`;
        console.log('URL con timestamp para UI:', urlWithTimestamp);

        // Actualizar perfil con la nueva URL de avatar
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error al actualizar perfil:', updateError);
          throw new Error('Error al actualizar perfil: ' + updateError.message);
        }
        
        console.log('Perfil actualizado con nueva URL de avatar');
        
        // Actualizar la UI
        setAvatar(file);
        setAvatarUrl(urlWithTimestamp);
        setSuccess('Foto de perfil actualizada correctamente');
        
        // Emitir evento personalizado para notificar a otros componentes
        const avatarUpdateEvent = new CustomEvent(AVATAR_UPDATED_EVENT, { 
          detail: { 
            avatarUrl: urlWithTimestamp,
            userId: user.id,
            timestamp: timestamp
          } 
        });
        window.dispatchEvent(avatarUpdateEvent);
        console.log('Evento de actualización de avatar emitido');
        
        // Refrescar el perfil
        getProfile();
      } catch (uploadErr) {
        console.error('Error al subir avatar:', uploadErr);
        throw uploadErr;
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setError(error.message || 'Error al actualizar la foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Update profile (without avatar, since it's handled separately)
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update user metadata
      await supabase.auth.updateUser({
        data: { name }
      });

      setSuccess('Perfil actualizado correctamente');
      getProfile();
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }

      if (newPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual es incorrecta');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess('Contraseña actualizada correctamente');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pb-24">
      {/* Título y Subtítulo Modificados */}
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Mi Perfil
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Gestiona tu información personal y preferencias.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
        <form onSubmit={updateProfile} className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {avatarUrl ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Si hay error al cargar la imagen, mostrar inicial
                      e.target.style.display = 'none';
                      console.error('Error loading avatar image');
                    }}
                />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                  {name ? name[0].toUpperCase() : profile?.email[0].toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 cursor-pointer hover:bg-purple-700 transition-colors">
                {uploadingAvatar ? (
                  <RefreshCw className="h-4 w-4 text-white animate-spin" />
                ) : (
                <Camera className="h-4 w-4 text-white" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Foto de perfil</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPG o PNG. Máximo 5MB.
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="inline h-4 w-4 mr-2" />
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              placeholder="Tu nombre"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="inline h-4 w-4 mr-2" />
              Correo electrónico
            </label>
            <input
              type="email"
              value={profile?.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 sm:text-sm cursor-not-allowed"
            />
          </div>

          {/* Submit Button - Solo se muestra si hay cambios */}
          {hasChanges && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
          )}
        </form>

        {/* Password Change Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Key className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cambiar contraseña
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-purple-600 hover:text-purple-500 text-sm font-medium"
            >
              {showPasswordForm ? 'Cancelar' : 'Cambiar'}
            </button>
          </div>

          {showPasswordForm && (
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <form onSubmit={updatePassword} className="space-y-4">
                {/* Current Password */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      'Actualizar contraseña'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <button
            onClick={async () => {
              try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}