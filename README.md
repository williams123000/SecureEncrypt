
# 🔐 SecureEncrypt

  

Una aplicación construida con **Next.js** y **Supabase** que permite a los usuarios autenticarse, subir archivos cifrados, descargarlos con enlaces firmados, y eliminarlos de forma segura.

  

## 🚀 Características

  

- 📂 Subida de archivos cifrados al almacenamiento de Supabase

- 🔒 Autenticación de usuarios (registro, login, logout)

- 📥 Generación de enlaces temporales para descargas seguras

- 🗑️ Eliminación de archivos con control de acceso

- 📃 Listado de archivos por usuario

- 🧠 Arquitectura modular con API Routes y Supabase como backend

  

---

  

## 🧱 Tecnologías

  

- [Next.js](https://nextjs.org/)

- [Supabase](https://supabase.com/)

- [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

- [Supabase Auth](https://supabase.com/docs/guides/auth)

- [Supabase Storage](https://supabase.com/docs/guides/storage)

  

---

  

## 📦 Instalación

  

1.  **Clona el repositorio**

  

```bash

git  clone  https://github.com/tu-usuario/file-encryption-app.git

cd  file-encryption-app
```

2.  **Instala dependencias**
  
```bash
npm install
```

3.  **Crea un archivo `.env.local`** con tus claves de Supabase:
 ```bash
NEXT_PUBLIC_SUPABASE_URL=https://<tu-url>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>`
```

4.  **Ejecuta la app**
```bash
npm run dev
```
---

## 🔐 Autenticación
La app incluye un sistema de autenticación con:

-   Registro de usuario
    
-   Inicio de sesión
    
-   Cierre de sesión
    
-   Contexto global de autenticación (`AuthContext`)
    

> Autenticación gestionada a través de Supabase Auth y el hook `useAuth`.

---
## 📁 Funcionalidad de Archivos
### ➕ Subida

Ruta: `POST /api/upload`

-   Verifica si se recibió un archivo
    
-   Lo sube al bucket `encrypted-files`
    
-   Registra la metadata en la tabla `encrypted_files`
    

### 📃 Listado

Ruta: `GET /api/files`

-   Verifica JWT del usuario
    
-   Devuelve archivos ordenados por fecha de subida
    

### 📥 Descarga

Ruta: `GET /api/download/[fileId]?share=true|false`

-   Si `share=true`, permite descarga sin autenticación
    
-   Genera una URL firmada de Supabase válida por 1 hora
    

### 🗑️ Eliminación

Ruta: `DELETE /api/files/[fileId]`

-   Requiere autenticación
    
-   Verifica si el archivo pertenece al usuario
    
-   Lo elimina del bucket y de la base de datos

---

## 🧠 Arquitectura del Código
```bash
├── app
│   └── api
│       ├── files
│       │   ├── [fileId]         # DELETE (eliminación individual)
│       │   └── route.js         # GET (listado de archivos)
│       ├── download
│       │   └── [fileId]         # GET (descarga con enlace firmado)
│       └── upload
│           └── route.js         # POST (subida de archivo)
├── components
│   ├── AuthForm.jsx             # Formulario de autenticación
│   └── FileEncryptionApp.jsx    # Interfaz de usuario principal
├── lib
│   └── supabase.js              # Cliente de Supabase
│   └── AuthContext.jsx          # Contexto global de autenticación
└── pages
    └── page.js                  # Página principal
```

---

## 📸 Capturas de Pantalla
<p align="center">
  <img src="https://github.com/williams123000/SecureEncrypt/blob/main/src/assets/images/login.png" width="600" height="auto"/>
</p>

<p align="center">
  <img src="htthttps://github.com/williams123000/SecureEncrypt/blob/main/src/assets/images/register.png" width="600" height="auto"/>
</p>

<p align="center">
  <img src="https://github.com/williams123000/SecureEncrypt/blob/main/src/assets/images/home1.png" width="600" height="auto"/>
</p>

<p align="center">
  <img src="https://github.com/williams123000/SecureEncrypt/blob/main/src/assets/images/home2.png" width="600" height="auto"/>
</p>

--- 
## 🧑‍💻 Autores

**Williams Chan**
[GitHub](https://github.com/williams123000) · [LinkedIn](https://www.linkedin.com/in/williams-chan-pescador-998ba4302/)

**Jorge Octavio**  

---

## 📝 Licencia

Este proyecto está bajo la licencia MIT.