"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Mail, Lock, UserPlus, Loader2 } from 'lucide-react';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      if (isRegistering) {
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Registro exitoso. Por favor, revisa tu correo para confirmar.');
      } else {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        setMessage('Inicio de sesión exitoso.');
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isRegistering) {
      router.push('/');
    }
  }, [user, isRegistering, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center">
        {/* Formulario */}
        <div className="w-full md:w-1/2 max-w-md space-y-8 p-6 md:p-8 bg-white md:shadow-lg md:rounded-lg order-1">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              {isRegistering ? 'Crear una cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isRegistering ? 'Regístrate para comenzar' : 'Ingresa a tu cuenta'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div className="relative">
                <label htmlFor="email" className="sr-only">
                  Correo electrónico
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isRegistering ? (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Registrarse
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-5 w-5" />
                        Iniciar sesión
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>

          {message && (
            <div
              className={`text-center p-4 rounded-md ${
                message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {message}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isRegistering
                ? '¿Ya tienes una cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>

        {/* Imagen fija para escritorio */}
        <div
          className="hidden md:block w-full md:w-1/2 h-96 bg-cover bg-center order-2 transition-all duration-300 ease-in-out"
          style={{
            backgroundImage: isRegistering
              ? `url('https://img.freepik.com/foto-gratis/codificacion-criptomonedas-fondo-azul-digital-concepto-cadena-bloques-codigo-abierto_53876-124644.jpg?t=st=1743806047~exp=1743809647~hmac=33afcdd78c33aca8ca0927366f762bb18f91180df8e9e4ef3df192ee4d4d5722&w=2000')` // Imagen para "Registrarse"
              : `url('https://img.freepik.com/foto-gratis/concepto-software-tecnologia-digitos-codigo-binario_53876-121041.jpg?t=st=1743806011~exp=1743809611~hmac=2a387f6c9ab7fd2ac899ef0e7938195b0ed087c3c939bd2511f54167e7eb07d7&w=1480')`, // Imagen para "Iniciar sesión"
          }}
        ></div>
      </div>
    </div>
  );
}