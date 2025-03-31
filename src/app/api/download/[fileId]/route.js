// app/api/download/[fileId]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { fileId } = params;

    // Obtener el token JWT de los headers para autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener los metadatos del archivo desde la tabla encrypted_files
    const { data: fileData, error: fileError } = await supabase
      .from('encrypted_files')
      .select('file_path, file_name')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'Archivo no encontrado o no tienes permiso' },
        { status: 404 }
      );
    }

    // Generar una URL firmada para descargar el archivo desde Supabase Storage
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('encrypted-files')
      .createSignedUrl(fileData.file_path, 60); // URL válida por 60 segundos

    if (signedUrlError) {
      console.error('Error al generar URL firmada:', signedUrlError);
      return NextResponse.json(
        { error: 'Error al generar enlace de descarga' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: fileData.file_name,
      message: 'URL de descarga generada exitosamente'
    });
  } catch (error) {
    console.error('Error en la API de descarga:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}