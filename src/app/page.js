"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import FileEncryptionApp from '../components/FileEncryptionApp';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [delayedLoading, setDelayedLoading] = useState(true); 

  useEffect(() => {
    // Retraso artificial de 2 segundos en el loader
    const timer = setTimeout(() => {
      setDelayedLoading(false);
    }, 1500);

    return () => clearTimeout(timer); // Limpiar el temporizador al desmontar
  }, []);

  useEffect(() => {
    if (!loading && !user && !delayedLoading) {
      router.push('/auth');
    }
  }, [user, loading, delayedLoading, router]);

  if (loading || delayedLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <FileEncryptionApp />;
}
