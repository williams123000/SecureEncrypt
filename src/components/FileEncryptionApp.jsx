// components/FileEncryptionApp.jsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Shield, Upload, Download, Save, Lock, Key, Info, FileText, Trash, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

export default function FileEncryptionApp() {
    const [file, setFile] = useState(null);
    const [encryptedFile, setEncryptedFile] = useState(null);
    const [password, setPassword] = useState('');
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [savedFiles, setSavedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Simulamos un ID de usuario - En una app real, esto vendría de la autenticación
    const { user, signOut } = useAuth();
    const userId = user?.id;

    //console.log('userId', userId);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    // Cargar archivos guardados al iniciar
    useEffect(() => {
        fetchSavedFiles();
    }, []);

    const fetchSavedFiles = async () => {
        if (!userId) return;
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/files?userId=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setSavedFiles(data.files || []);
            }
        } catch (error) {
            console.error('Error al cargar archivos guardados:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            if (e.target.files[0].size > 50 * 1024 * 1024) {
                setStatus('El archivo es demasiado grande. El tamaño máximo permitido es de 50 MB.');
                return;
            }

            setFile(e.target.files[0]);
            setEncryptedFile(null);
            setStatus('');
        }
    };

    const generateKey = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    };



    const encryptFile = async () => {
        if (!file || !password) {
            setStatus('Por favor selecciona un archivo y establece una contraseña.');
            return;
        }
        //Si tiene extension .encrypted, no lo encripta
        if (file.name.endsWith('.encrypted')) {
            setStatus('El archivo ya está encriptado. ' + file.name);
            return;
        }

        try {
            setIsEncrypting(true);
            setStatus('Encriptando archivo...');

            // Generar vector de inicialización (IV)
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Generar clave de la contraseña
            const key = await generateKey(password);

            // Leer el archivo
            const fileContent = await file.arrayBuffer();

            // Encriptar el contenido
            const encryptedContent = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                fileContent
            );

            // Combinar IV y contenido encriptado
            const encryptedData = new Uint8Array(iv.length + encryptedContent.byteLength);
            encryptedData.set(iv, 0);
            encryptedData.set(new Uint8Array(encryptedContent), iv.length);

            // Crear archivo encriptado
            const encryptedBlob = new Blob([encryptedData], { type: 'application/encrypted' });
            const encryptedFileObj = new File([encryptedBlob], `${file.name}.encrypted`, {
                type: 'application/encrypted'
            });

            setEncryptedFile(encryptedFileObj);
            setStatus('Archivo encriptado exitosamente. Puedes descargarlo o almacenarlo.');
        } catch (error) {
            console.error(error);
            setStatus('Error al encriptar el archivo: ' + error.message);
        } finally {
            setIsEncrypting(false);
        }
    };

    const decryptFile = async () => {
        if (!file || !password) {
            setStatus('Por favor selecciona un archivo encriptado y proporciona la contraseña.');
            return;
        }
        //Si no tiene extension .encrypted, no lo desencripta
        if (!file.name.endsWith('.encrypted')) {
            setStatus('El archivo no está encriptado. ' + file.name);
            return;
        }

        try {
            setIsEncrypting(true);
            setStatus('Desencriptando archivo...');

            // Leer el archivo
            const fileContent = await file.arrayBuffer();
            const encryptedData = new Uint8Array(fileContent);

            // Extraer IV (primeros 12 bytes)
            const iv = encryptedData.slice(0, 12);

            // Extraer contenido encriptado
            const encryptedContent = encryptedData.slice(12);

            // Generar clave de la contraseña
            const key = await generateKey(password);

            // Desencriptar el contenido
            const decryptedContent = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                encryptedContent
            );

            // Crear el archivo desencriptado
            const originalFileName = file.name.endsWith('.encrypted')
                ? file.name.slice(0, -10)
                : `decrypted-${file.name}`;

            const decryptedBlob = new Blob([decryptedContent]);
            const decryptedFile = new File([decryptedBlob], originalFileName, {
                type: 'application/octet-stream'
            });

            setEncryptedFile(decryptedFile);
            setStatus('Archivo desencriptado exitosamente. Puedes descargarlo.');
        } catch (error) {
            console.error(error);
            setStatus('Error al desencriptar el archivo. Verifica que la contraseña sea correcta.');
        } finally {
            setIsEncrypting(false);
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
        }
    };

    const uploadToSupabase = async () => {
        // Extraer los archivos que estan en la bd para no guardar el mismo archivo
        const files = savedFiles.map((file) => file.file_name);
        if (files.includes(encryptedFile.name)) {
            setStatus('El archivo ya está almacenado en tu servidor.');
            return;
        }
        if (!encryptedFile) {
            setStatus('No hay archivo encriptado para almacenar.');
            return;
        }

        try {
            setIsUploading(true);
            setStatus('Subiendo archivo a Supabase...');

            const formData = new FormData();
            formData.append('file', encryptedFile);
            formData.append('fileName', encryptedFile.name);
            formData.append('userId', userId);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('Archivo almacenado exitosamente en Supabase.');
                // Refrescar la lista de archivos
                fetchSavedFiles();
            } else {
                setStatus(`Error: ${data.error || 'Error al almacenar el archivo'}`);
            }
        } catch (error) {
            console.error(error);
            setStatus('Error al subir el archivo: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadFromSupabase = async (fileId) => {
        try {
            setStatus('Obteniendo enlace de descarga...');
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/download/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}` // Añadir token
                }
            });
            const data = await response.json();

            if (response.ok && data.downloadUrl) {
                const a = document.createElement('a');
                a.href = data.downloadUrl;
                a.download = data.fileName || 'archivo-encriptado';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setStatus('Descarga iniciada.');
            } else {
                setStatus(`Error: ${data.error || 'No se pudo obtener el enlace de descarga'}`);
            }
        } catch (error) {
            console.error(error);
            setStatus('Error al descargar el archivo: ' + error.message);
        }
    };

    const deleteFromSupabase = async (fileId) => {
        try {
            setStatus('Eliminando archivo...');
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/delete/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}` // Añadir token
                }
            });

            if (response.ok) {
                setStatus('Archivo eliminado exitosamente.');
                fetchSavedFiles(); // Actualizar la lista
            } else {
                const data = await response.json();
                setStatus(`Error: ${data.error || 'No se pudo eliminar el archivo'}`);
            }
        } catch (error) {
            console.error(error);
            setStatus('Error al eliminar el archivo: ' + error.message);
        }
    };

    return (

        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 border-b">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <Shield className="text-blue-600 mr-2" size={24} />
                        <h1 className="text-xl font-bold text-gray-900">SecureEncrypt</h1>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <Lock className="mr-2 text-blue-600" size={20} />
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
                            {/* Selector de archivo */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors duration-200">
                                <div className="flex flex-col items-center justify-center">
                                    <FileText className={`h-12 w-12 mb-4 ${file ? 'text-blue-600' : 'text-gray-400'}`} />

                                    {file ? (
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-900">{file.name}</p>
                                            <p className="text-gray-500">{Math.round(file.size / 1024)} KB</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">Arrastra y suelta tu archivo aquí o haz clic para seleccionar</p>
                                    )}

                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Seleccionar archivo
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 flex items-center">
                                    <Key className="mr-1 h-4 w-4 text-gray-500" />
                                    Contraseña de encriptación
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa una contraseña segura"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                    Esta contraseña será necesaria para desencriptar el archivo. No la olvides.
                                </p>
                            </div>

                            {/* Botones de acción */}
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

                            {/* Estado */}
                            {status && (
                                <div className={`p-3 rounded-md ${status.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {status}
                                </div>
                            )}

                            {/* Lista de archivos guardados */}
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Archivos Almacenados</h3>
                                    <button
                                        onClick={fetchSavedFiles}
                                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Actualizar
                                    </button>
                                </div>

                                {isLoading ? (
                                    <p className="text-gray-500 text-center py-4">Cargando archivos...</p>
                                ) : savedFiles.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {savedFiles.map((file) => (
                                                    <tr key={file.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {file.file_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {Math.round(file.file_size / 1024)} KB
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(file.uploaded_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => downloadFromSupabase(file.id)}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteFromSupabase(file.id)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
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
                                    <p className="text-gray-500 text-center py-4 border rounded-md">No hay archivos almacenados aún.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t py-4">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
                    SecureEncrypt &copy; {new Date().getFullYear()} - Encriptación segura en el navegador
                </div>
            </footer>
        </div>
    );
}