// app/api/files/[fileId]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
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

    // Obtener los metadatos del archivo para eliminarlo del storage
    const { data: fileData, error: fileError } = await supabase
      .from('encrypted_files')
      .select('file_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'Archivo no encontrado o no tienes permiso' },
        { status: 404 }
      );
    }

    // Eliminar el archivo de Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from('encrypted-files')
      .remove([fileData.file_path]);

    if (storageError) {
      console.error('Error al eliminar el archivo del storage:', storageError);
      return NextResponse.json(
        { error: 'Error al eliminar el archivo del almacenamiento' },
        { status: 500 }
      );
    }

    // Eliminar el registro de la base de datos
    const { error: dbError } = await supabase
      .from('encrypted_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('Error al eliminar el registro de la base de datos:', dbError);
      return NextResponse.json(
        { error: 'Error al eliminar el registro del archivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error en la API de eliminación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}