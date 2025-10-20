# ⚙️ CONFIGURAR EMAIL TEMPLATE EN SUPABASE

## 🎯 OBJETIVO

Hacer que cuando el usuario haga clic en el email de confirmación, vaya a tu sitio web React donde confirmas el email y luego abres la app.

---

## 📋 PASOS EN SUPABASE DASHBOARD

### **PASO 1: Ir a Email Templates**

1. Abre: https://supabase.com/dashboard
2. Selecciona tu proyecto: **Lexingo**
3. Ve a: **Authentication** (menú lateral izquierdo)
4. Click en: **Email Templates**

---

### **PASO 2: Editar "Confirm signup" template**

1. En la lista de templates, busca: **Confirm signup**
2. Haz clic en **"Edit"** o en el template

---

### **PASO 3: Modificar la Confirmation URL**

En el template, busca la sección que dice:

```
Confirmation URL: {{ .ConfirmationURL }}
```

**Cámbiala por:**

```
Confirmation URL: {{ .SiteURL }}/email-confirmed?token={{ .Token }}&type=signup
```

**Explicación:**
- `{{ .SiteURL }}` = Tu Site URL configurado (https://lexingo.netlify.app)
- `/email-confirmed` = La ruta de tu página React
- `?token={{ .Token }}` = El token de confirmación
- `&type=signup` = Tipo de verificación

---

### **PASO 4: Configurar Site URL**

1. Ve a: **Authentication → Settings**
2. Busca la sección: **Site URL**
3. Configura:

```
Site URL: https://lexingo.netlify.app
```

4. Guarda

---

### **PASO 5: Configurar Redirect URLs**

En la misma página (**Authentication → Settings**):

1. Busca: **Redirect URLs**
2. Agrega TODAS estas URLs (una por línea):

```
https://lexingo.netlify.app/email-confirmed
https://lexingo.netlify.app/auth/confirm
lexingo://auth/callback
exp://192.168.1.7:8082
http://localhost:3000/email-confirmed
```

3. **Guarda**

**Explicación:**
- Primera línea: Página de confirmación en producción
- Segunda línea: Ruta alternativa (por si usas /auth/confirm)
- Tercera línea: Deep link a la app (producción)
- Cuarta línea: Deep link en desarrollo con Expo
- Quinta línea: Desarrollo local de tu sitio React

---

### **PASO 6: Personalizar el Email (OPCIONAL)**

Si quieres personalizar el mensaje del email, edita el HTML del template:

```html
<h2>Confirma tu email</h2>

<p>Hola,</p>

<p>Gracias por registrarte en Lexingo AI.</p>

<p>Para completar tu registro, por favor confirma tu email haciendo clic en el botón de abajo:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirmar mi email</a></p>

<p>Este enlace expirará en 24 horas.</p>

<p>Si no creaste esta cuenta, puedes ignorar este email.</p>

<p>Saludos,<br>
El equipo de Lexingo AI</p>
```

---

## 🧪 TESTING

### **Test 1: Verificar configuración**

1. Ve a: **Authentication → URL Configuration**
2. Verifica que veas:
   ```
   Site URL: https://lexingo.netlify.app
   Redirect URLs: [las 5 URLs que agregaste]
   ```

---

### **Test 2: Probar email**

1. **Registra un usuario de prueba** desde la app
2. **Revisa tu email**
3. **Verifica la URL del botón:**
   - Haz clic derecho en "Confirmar email"
   - "Copiar dirección del enlace"
   - Debería ser algo como:
     ```
     https://lexingo.netlify.app/email-confirmed?token=ABC123...&type=signup
     ```

4. **Haz clic en el botón**
5. **Debería:**
   - Abrir tu sitio web en https://lexingo.netlify.app/email-confirmed
   - Mostrar "Verificando tu email..."
   - Luego mostrar "✅ Email confirmado!"
   - Countdown "Redirigiendo en 5... 4..."
   - Intentar abrir la app automáticamente

---

## ⚠️ IMPORTANTE

### **Si usas SMTP personalizado (Gmail, SendGrid, etc.):**

Asegúrate de que:
1. ✅ SMTP está configurado correctamente
2. ✅ Sender email está verificado
3. ✅ Credenciales son correctas

**Para verificar:**
- Ve a: **Project Settings → Auth → SMTP Settings**
- Debe mostrar estado: ✅ Connected

---

### **Si los emails no llegan:**

1. Revisa la carpeta de **Spam**
2. Revisa **Logs:**
   - Dashboard → Logs
   - Buscar: `email` o `smtp`
3. Si ves errores:
   - `smtp connection failed` → Verifica credenciales
   - `rate limit` → Espera unos minutos

---

## 📊 VERIFICAR EN BASE DE DATOS

Puedes verificar si el email se confirmó:

```sql
-- Ver usuarios con email confirmado
SELECT
  email,
  email_confirmed_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '⏳ Pendiente'
  END as estado
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎨 PREVIEW DEL EMAIL

En **Email Templates**, puedes hacer clic en **"Send test email"** para:
1. Ver cómo se ve el email
2. Verificar que la URL sea correcta
3. Probar el flujo completo

**Para probar:**
1. Ingresa tu email personal
2. Click en "Send test email"
3. Revisa tu bandeja de entrada
4. Verifica la URL del botón

---

## ✅ CHECKLIST FINAL

Antes de considerar esto completo:

- [ ] Site URL configurado: `https://lexingo.netlify.app`
- [ ] Redirect URLs agregadas (las 5)
- [ ] Email template editado con nueva Confirmation URL
- [ ] SMTP configurado y funcionando
- [ ] Test email enviado y recibido
- [ ] URL del email verificada (debe apuntar a /email-confirmed)
- [ ] Página React `/email-confirmed` creada (ver CODIGO_PAGINA_EMAIL_CONFIRMED.jsx)
- [ ] Deep linking verificado (`lexingo://auth/callback` abre la app)
- [ ] Testing completo con usuario real

---

**Fecha:** Octubre 2025
**Autor:** Claude Code + Lexingo Team

---

**NOTA:** Guarda estas configuraciones. Las necesitarás también para:
- Password recovery (olvidé mi contraseña)
- Email change confirmation (cambio de email)
