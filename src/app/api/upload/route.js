// app/api/upload/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName');
    const userId = formData.get('userId') || 'anonymous'; // Idealmente, obtén esto de la sesión
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Convertir el archivo a un buffer para subirlo a Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('encrypted-files')
      .upload(`${userId}/${fileName}`, buffer, {
        contentType: 'application/encrypted',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error al subir el archivo a Supabase:', error);
      return NextResponse.json(
        { error: 'Error al subir el archivo' },
        { status: 500 }
      );
    }

    // Registrar la información del archivo en la base de datos
    const { error: dbError } = await supabase
      .from('encrypted_files')
      .insert({
        file_name: fileName,
        file_path: data.path,
        user_id: userId,
        file_size: buffer.length,
        uploaded_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error al registrar el archivo en la base de datos:', dbError);
      // Intentar eliminar el archivo ya subido
      await supabase.storage.from('encrypted-files').remove([data.path]);
      
      return NextResponse.json(
        { error: 'Error al registrar el archivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath: data.path,
      message: 'Archivo subido exitosamente'
    });
    
  } catch (error) {
    console.error('Error en la API de carga:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}