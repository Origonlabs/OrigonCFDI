'use server';

import { adminStorage } from '@/lib/firebase/admin';

// Tiempo de expiración de URLs firmadas (en milisegundos)
const SIGNED_URL_EXPIRATION = 60 * 60 * 1000; // 1 hora

type UploadResult = {
  success: true;
  url: string;
  path: string;
} | {
  success: false;
  message: string;
};

/**
 * Sube un archivo a Firebase Storage y devuelve una URL firmada
 */
export async function uploadFile(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  if (!adminStorage) {
    return {
      success: false,
      message: 'Firebase Storage no está configurado.',
    };
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Subir el archivo
    await file.save(buffer, {
      metadata: { contentType },
    });

    // Generar URL firmada con expiración
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_EXPIRATION,
    });

    return {
      success: true,
      url: signedUrl,
      path,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error al subir archivo: ${message}`,
    };
  }
}

/**
 * Genera una nueva URL firmada para un archivo existente
 */
export async function getSignedUrl(
  path: string,
  expirationMs: number = SIGNED_URL_EXPIRATION
): Promise<string | null> {
  if (!adminStorage) {
    console.warn('Firebase Storage no está configurado.');
    return null;
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Verificar si el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found: ${path}`);
      return null;
    }

    // Generar URL firmada
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expirationMs,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Sube archivos de factura (PDF y XML) y devuelve URLs firmadas
 */
export async function uploadInvoiceFiles(
  userId: string,
  clientId: number,
  serie: string,
  folio: number,
  pdfBuffer: Buffer,
  xmlContent: string
): Promise<{
  pdfUrl: string | null;
  xmlUrl: string | null;
  pdfPath: string;
  xmlPath: string;
}> {
  const basePath = `invoices/${userId}/${clientId}`;
  const pdfPath = `${basePath}/${serie}-${folio}.pdf`;
  const xmlPath = `${basePath}/${serie}-${folio}.xml`;

  let pdfUrl: string | null = null;
  let xmlUrl: string | null = null;

  // Subir PDF
  const pdfResult = await uploadFile(pdfBuffer, pdfPath, 'application/pdf');
  if (pdfResult.success) {
    pdfUrl = pdfResult.url;
  } else {
    console.error('Error uploading PDF:', pdfResult.message);
  }

  // Subir XML
  const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
  const xmlResult = await uploadFile(xmlBuffer, xmlPath, 'application/xml');
  if (xmlResult.success) {
    xmlUrl = xmlResult.url;
  } else {
    console.error('Error uploading XML:', xmlResult.message);
  }

  return { pdfUrl, xmlUrl, pdfPath, xmlPath };
}

/**
 * Regenera URLs firmadas para archivos de factura
 * Usar cuando las URLs han expirado
 */
export async function refreshInvoiceUrls(
  pdfPath: string,
  xmlPath: string
): Promise<{
  pdfUrl: string | null;
  xmlUrl: string | null;
}> {
  const pdfUrl = await getSignedUrl(pdfPath);
  const xmlUrl = await getSignedUrl(xmlPath);

  return { pdfUrl, xmlUrl };
}

/**
 * Elimina archivos de factura de Storage
 */
export async function deleteInvoiceFiles(
  pdfPath: string,
  xmlPath: string
): Promise<boolean> {
  if (!adminStorage) {
    return false;
  }

  try {
    const bucket = adminStorage.bucket();

    // Eliminar PDF
    const pdfFile = bucket.file(pdfPath);
    const [pdfExists] = await pdfFile.exists();
    if (pdfExists) {
      await pdfFile.delete();
    }

    // Eliminar XML
    const xmlFile = bucket.file(xmlPath);
    const [xmlExists] = await xmlFile.exists();
    if (xmlExists) {
      await xmlFile.delete();
    }

    return true;
  } catch (error) {
    console.error('Error deleting invoice files:', error);
    return false;
  }
}
