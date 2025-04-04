import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { fileId } = params;
    const authHeader = request.headers.get('authorization');
    const share = request.nextUrl.searchParams.get('share') === 'true'; // Corrección aquí

    let user;
    if (!share) {
      if (!authHeader) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (error || !data.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      user = data.user;
    }

    const query = supabase
      .from('encrypted_files')
      .select('file_path, file_name')
      .eq('id', fileId);
    if (!share) query.eq('user_id', user.id);

    const { data: fileData, error: fileError } = await query.single();
    if (fileError || !fileData) {
      return NextResponse.json({ error: 'Archivo no encontrado o no tienes permiso' }, { status: 404 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('encrypted-files')
      .createSignedUrl(fileData.file_path, 3600); // 1 hora de validez

    if (signedUrlError) {
      console.error('Error al generar URL firmada:', signedUrlError);
      return NextResponse.json({ error: 'Error al generar enlace de descarga' }, { status: 500 });
    }

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: fileData.file_name,
      message: 'URL de descarga generada exitosamente',
    });
  } catch (error) {
    console.error('Error en la API de descarga:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}