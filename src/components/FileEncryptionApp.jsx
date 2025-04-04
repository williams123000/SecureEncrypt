"use client";

import { useState, useRef, useEffect } from 'react';
import { Shield, Upload, Download, Save, Lock, Key, Info, FileText, Trash, RefreshCw, Share } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function FileEncryptionApp() {
  const [file, setFile] = useState(null);
  const [encryptedFile, setEncryptedFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savedFiles, setSavedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef(null);

  const { user, signOut } = useAuth();
  const userId = user?.id;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada exitosamente.');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión.');
    }
  };

  useEffect(() => {
    fetchSavedFiles();
  }, [userId]);

  const fetchSavedFiles = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/files?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSavedFiles(data.files || []);
      } else {
        toast.error('Error al cargar archivos.');
      }
    } catch (error) {
      console.error('Error al cargar archivos guardados:', error);
      toast.error('Error al cargar archivos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      if (e.target.files[0].size > 50 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 50 MB.');
        return;
      }
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setEncryptedFile(null);

      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setFilePreview({ type: 'image', url });
      } else if (selectedFile.type === 'application/pdf') {
        setFilePreview({ type: 'pdf', url: URL.createObjectURL(selectedFile) });
      } else if (selectedFile.type.startsWith('text/')) {
        selectedFile.text().then((text) => setFilePreview({ type: 'text', content: text.slice(0, 200) }));
      } else {
        setFilePreview(null);
      }
    }
  };

  const generateKey = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  };

  const encryptFile = async () => {
    if (!file || !password || !confirmPassword) {
      toast.error('Por favor selecciona un archivo y completa ambos campos de contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (file.name.endsWith('.encrypted')) {
      toast.error('El archivo ya está encriptado: ' + file.name);
      return;
    }

    try {
      setIsEncrypting(true);
      toast.loading('Encriptando archivo...', { id: 'encrypt' });
      setProgress(0);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await generateKey(password);
      const fileContent = await file.arrayBuffer();

      setProgress(30);
      const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileContent);
      setProgress(80);

      const encryptedData = new Uint8Array(iv.length + encryptedContent.byteLength);
      encryptedData.set(iv, 0);
      encryptedData.set(new Uint8Array(encryptedContent), iv.length);

      const encryptedBlob = new Blob([encryptedData], { type: 'application/encrypted' });
      const encryptedFileObj = new File([encryptedBlob], `${file.name}.encrypted`, {
        type: 'application/encrypted',
      });

      setEncryptedFile(encryptedFileObj);
      setProgress(100);
      toast.success('Archivo encriptado exitosamente.', { id: 'encrypt' });
    } catch (error) {
      console.error(error);
      toast.error('Error al encriptar el archivo: ' + error.message, { id: 'encrypt' });
    } finally {
      setIsEncrypting(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const decryptFile = async () => {
    if (!file || !password) {
      toast.error('Por favor selecciona un archivo encriptado y proporciona la contraseña.');
      return;
    }
    if (!file.name.endsWith('.encrypted')) {
      toast.error('El archivo no está encriptado: ' + file.name);
      return;
    }

    try {
      setIsEncrypting(true);
      toast.loading('Desencriptando archivo...', { id: 'decrypt' });
      setProgress(0);

      const fileContent = await file.arrayBuffer();
      const encryptedData = new Uint8Array(fileContent);
      const iv = encryptedData.slice(0, 12);
      const encryptedContent = encryptedData.slice(12);

      setProgress(30);
      const key = await generateKey(password);
      const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedContent);
      setProgress(80);

      const originalFileName = file.name.endsWith('.encrypted') ? file.name.slice(0, -10) : `decrypted-${file.name}`;
      const decryptedBlob = new Blob([decryptedContent]);
      const decryptedFile = new File([decryptedBlob], originalFileName, { type: 'application/octet-stream' });

      setEncryptedFile(decryptedFile);
      setProgress(100);
      toast.success('Archivo desencriptado exitosamente.', { id: 'decrypt' });
    } catch (error) {
      console.error(error);
      toast.error('Error al desencriptar el archivo. Verifica la contraseña.', { id: 'decrypt' });
    } finally {
      setIsEncrypting(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const downloadFile = () => {
    if (encryptedFile) {
      const url = URL.createObjectURL(encryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = encryptedFile.name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Descarga iniciada.');
    }
  };

  const uploadToSupabase = async () => {
    const files = savedFiles.map((file) => file.file_name);
    if (files.includes(encryptedFile.name)) {
      toast.error('El archivo ya está almacenado en tu servidor.');
      return;
    }
    if (!encryptedFile) {
      toast.error('No hay archivo encriptado para almacenar.');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('Subiendo archivo a Supabase...', { id: 'upload' });

      const formData = new FormData();
      formData.append('file', encryptedFile);
      formData.append('fileName', encryptedFile.name);
      formData.append('userId', userId);

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        toast.success('Archivo almacenado exitosamente en Supabase.', { id: 'upload' });
        fetchSavedFiles();
      } else {
        toast.error(`Error: ${data.error || 'Error al almacenar el archivo'}`, { id: 'upload' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el archivo: ' + error.message, { id: 'upload' });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFromSupabase = async (fileId) => {
    try {
      toast.loading('Obteniendo enlace de descarga...', { id: 'download' });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();

      if (response.ok && data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = data.fileName || 'archivo-encriptado';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Descarga iniciada.', { id: 'download' });
      } else {
        toast.error(`Error: ${data.error || 'No se pudo obtener el enlace'}`, { id: 'download' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al descargar el archivo: ' + error.message, { id: 'download' });
    }
  };

  const shareFile = async (fileId) => {
    try {
      const response = await fetch(`/api/download/${fileId}?share=true`);
      const data = await response.json();
      if (response.ok) {
        navigator.clipboard.writeText(data.downloadUrl);
        toast.success('Enlace copiado al portapapeles (válido por 1 hora).');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Error al generar enlace: ' + error.message);
    }
  };

  const deleteFromSupabase = async (fileId) => {
    try {
      toast.loading('Eliminando archivo...', { id: 'delete' });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        toast.success('Archivo eliminado exitosamente.', { id: 'delete' });
        fetchSavedFiles();
      } else {
        const data = await response.json();
        toast.error(`Error: ${data.error || 'No se pudo eliminar el archivo'}`, { id: 'delete' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar el archivo: ' + error.message, { id: 'delete' });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <Toaster position="top-right" reverseOrder={false} />
      <header className={`shadow-sm p-4 border-b ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Shield className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            <h1 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>SecureEncrypt</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleSignOut}
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className={`max-w-4xl mx-auto rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          <div className="p-6">
            <h2 className={`text-2xl font-bold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              <Lock className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
              Encriptación Segura de Archivos
            </h2>

            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Seguridad garantizada</AlertTitle>
              <AlertDescription>
                Tus archivos son encriptados localmente en tu navegador. Tu contraseña nunca se envía al servidor.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors duration-200">
                <div className="flex flex-col items-center justify-center">
                  <FileText className={`h-12 w-12 mb-4 ${file ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {file ? (
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                      <p className="text-gray-500 dark:text-gray-400">{Math.round(file.size / 1024)} KB</p>
                      {filePreview && (
                        <div className="mt-2">
                          {filePreview.type === 'image' && (
                            <img src={filePreview.url} alt="Vista previa" className="max-w-full h-auto max-h-32" />
                          )}
                          {filePreview.type === 'pdf' && (
                            <p className="text-gray-500 dark:text-gray-400 italic">PDF seleccionado (vista previa no disponible en línea)</p>
                          )}
                          {filePreview.type === 'text' && (
                            <p className="text-gray-600 dark:text-gray-300 text-xs break-words">{filePreview.content}...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Arrastra y suelta tu archivo aquí o haz clic para seleccionar</p>
                  )}
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar archivo
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className={`block text-sm font-medium flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-700'}`}>
                  <Key className={`mr-1 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  Contraseña de encriptación
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa una contraseña segura"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <label htmlFor="confirm-password" className={`block text-sm font-medium  flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-700'}`}>
                  <Key className={`mr-1 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Esta contraseña será necesaria para desencriptar el archivo. No la olvides.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={encryptFile}
                  disabled={!file || !password || isEncrypting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Encriptar
                </button>
                <button
                  onClick={decryptFile}
                  disabled={!file || !password || isEncrypting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Desencriptar
                </button>
                <button
                  onClick={downloadFile}
                  disabled={!encryptedFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </button>
                <button
                  onClick={uploadToSupabase}
                  disabled={!encryptedFile || isUploading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isUploading ? 'Almacenando...' : 'Almacenar en tu Servidor'}
                </button>
              </div>

              {progress > 0 && (
                <div className="w-full mt-4">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{progress}% completado</p>
                </div>
              )}

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Archivos Almacenados</h3>
                  <button
                    onClick={fetchSavedFiles}
                    className={` flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-500`}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Actualizar
                  </button>
                </div>

                {isLoading ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Cargando archivos...</p>
                ) : savedFiles.length > 0 ? (
                  <div className="overflow-x-auto border rounded-md dark:border-gray-700">
                    <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Nombre</th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Tamaño</th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Fecha de subida</th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody className={darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}>
                        {savedFiles.map((file) => (
                          <tr key={file.id}>
                            <td className={`px-6 py-4 text-sm font-medium break-words max-w-xs ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                              {file.file_name}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {Math.round(file.file_size / 1024)} KB
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {new Date(file.uploaded_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button onClick={() => downloadFromSupabase(file.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                                  <Download className="h-4 w-4" />
                                </button>
                                <button onClick={() => shareFile(file.id)} className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300">
                                  <Share className="h-4 w-4" />
                                </button>
                                <button onClick={() => deleteFromSupabase(file.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                  <Trash className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4 border rounded-md dark:border-gray-700">
                    No hay archivos almacenados aún.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={`border-t py-4 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          SecureEncrypt &copy; {new Date().getFullYear()} - Encriptación segura en el navegador
        </div>
      </footer>
    </div>
  );
}