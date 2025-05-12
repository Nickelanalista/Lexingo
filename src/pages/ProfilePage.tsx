import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Camera, Eye, EyeOff, Loader2, Key, RefreshCw, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState('');
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

  useEffect(() => {
    getProfile();
  }, []);

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

      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        throw new Error('La imagen no debe superar 1MB');
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
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop().split('?')[0]; // Remover parámetros de query
        await supabase.storage
          .from('avatars')
          .remove([oldFileName]);
      }

      // Upload new avatar
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Añadir timestamp para evitar problemas de caché
      const timestamp = new Date().getTime();
      const urlWithTimestamp = `${publicUrl}?t=${timestamp}`;

      // Actualizar perfil con la nueva URL de avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Actualizar la UI
      setAvatar(file);
      setAvatarUrl(urlWithTimestamp);
      setSuccess('Foto de perfil actualizada correctamente');
      
      // Refrescar el perfil
      getProfile();
      
    } catch (error) {
      console.error('Error updating avatar:', error);
      setError(error.message);
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Mi Perfil
      </h1>

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

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
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
                JPG o PNG. Máximo 1MB.
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

          {/* Submit Button */}
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
            className="flex items-center w-full justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}