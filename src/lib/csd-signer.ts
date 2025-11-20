

import forge from 'node-forge';
import db from '@/lib/db';
import { csdCertificates } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { decryptCSDData } from '@/lib/encryption';

interface CSDData {
  certificateNumber: string;
  certificate: string;
  privateKey: string;
}

interface SignResultSuccess {
  success: true;
  sello: string;
  certificado: string;
  noCertificado: string;
}

interface SignResultError {
  success: false;
  message: string;
}

type SignResult = SignResultSuccess | SignResultError;

/**
 * Obtiene el certificado CSD activo del usuario
 */
export async function getActiveCSD(userId: string): Promise<CSDData | null> {
  if (!db) return null;

  try {
    const [csd] = await db
      .select({
        certificateNumber: csdCertificates.certificateNumber,
        certificate: csdCertificates.certificate,
        privateKey: csdCertificates.privateKey,
      })
      .from(csdCertificates)
      .where(
        and(
          eq(csdCertificates.userId, userId),
          eq(csdCertificates.status, 'active')
        )
      )
      .limit(1);

    if (!csd) return null;

    // Descifrar los datos del certificado
    const decryptedData = decryptCSDData({
      privateKey: csd.privateKey,
      certificate: csd.certificate,
    });

    return {
      certificateNumber: csd.certificateNumber,
      certificate: decryptedData.certificate,
      privateKey: decryptedData.privateKey,
    };
  } catch (error) {
    console.error('Error fetching CSD:', error);
    return null;
  }
}

/**
 * Genera la cadena original del CFDI según especificaciones del SAT
 * Esta es una versión simplificada - en producción debe seguir el XSLT oficial
 */
export function generateCadenaOriginal(xmlData: {
  version: string;
  serie: string;
  folio: string;
  fecha: string;
  formaPago: string;
  noCertificado: string;
  subTotal: string;
  moneda: string;
  total: string;
  tipoDeComprobante: string;
  exportacion: string;
  metodoPago: string;
  lugarExpedicion: string;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscal: string;
    regimenFiscal: string;
    usoCFDI: string;
  };
  conceptos: Array<{
    claveProdServ: string;
    cantidad: number;
    claveUnidad: string;
    descripcion: string;
    valorUnitario: string;
    importe: string;
    objetoImp: string;
    impuestos?: {
      base: string;
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: string;
      importe: string;
    };
  }>;
  impuestos: {
    totalImpuestosTrasladados: string;
    traslados: Array<{
      base: string;
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: string;
      importe: string;
    }>;
  };
}): string {
  const parts: string[] = [];

  // Datos del comprobante
  parts.push(xmlData.version);
  parts.push(xmlData.serie);
  parts.push(xmlData.folio);
  parts.push(xmlData.fecha);
  parts.push(xmlData.formaPago);
  parts.push(xmlData.noCertificado);
  parts.push(xmlData.subTotal);
  parts.push(xmlData.moneda);
  parts.push(xmlData.total);
  parts.push(xmlData.tipoDeComprobante);
  parts.push(xmlData.exportacion);
  parts.push(xmlData.metodoPago);
  parts.push(xmlData.lugarExpedicion);

  // Emisor
  parts.push(xmlData.emisor.rfc);
  parts.push(xmlData.emisor.nombre);
  parts.push(xmlData.emisor.regimenFiscal);

  // Receptor
  parts.push(xmlData.receptor.rfc);
  parts.push(xmlData.receptor.nombre);
  parts.push(xmlData.receptor.domicilioFiscal);
  parts.push(xmlData.receptor.regimenFiscal);
  parts.push(xmlData.receptor.usoCFDI);

  // Conceptos
  for (const concepto of xmlData.conceptos) {
    parts.push(concepto.claveProdServ);
    parts.push(concepto.cantidad.toString());
    parts.push(concepto.claveUnidad);
    parts.push(concepto.descripcion);
    parts.push(concepto.valorUnitario);
    parts.push(concepto.importe);
    parts.push(concepto.objetoImp);

    if (concepto.impuestos) {
      parts.push(concepto.impuestos.base);
      parts.push(concepto.impuestos.impuesto);
      parts.push(concepto.impuestos.tipoFactor);
      parts.push(concepto.impuestos.tasaOCuota);
      parts.push(concepto.impuestos.importe);
    }
  }

  // Impuestos totales
  parts.push(xmlData.impuestos.totalImpuestosTrasladados);
  for (const traslado of xmlData.impuestos.traslados) {
    parts.push(traslado.base);
    parts.push(traslado.impuesto);
    parts.push(traslado.tipoFactor);
    parts.push(traslado.tasaOCuota);
    parts.push(traslado.importe);
  }

  // Construir cadena original con formato ||valor|valor|...||
  return `||${parts.join('|')}||`;
}

/**
 * Firma la cadena original usando la llave privada del CSD
 */
export function signCadenaOriginal(cadenaOriginal: string, privateKeyPem: string): string {
  try {
    // Parsear la llave privada
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    // Crear el digest SHA-256 de la cadena original
    const md = forge.md.sha256.create();
    md.update(cadenaOriginal, 'utf8');

    // Firmar con RSA-SHA256
    const signature = privateKey.sign(md);

    // Convertir a Base64
    return forge.util.encode64(signature);
  } catch (error) {
    console.error('Error signing cadena original:', error);
    throw new Error('Error al firmar la cadena original');
  }
}

/**
 * Extrae el certificado en formato Base64 (sin headers PEM)
 */
export function getCertificateBase64(certificatePem: string): string {
  // Remover headers y footers del PEM
  return certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
}

/**
 * Extrae el número de certificado del certificado X.509
 */
export function extractCertificateNumber(certificatePem: string): string {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    // El número de serie en hexadecimal
    const serialHex = cert.serialNumber;

    // Convertir hex a string de números (formato SAT)
    // Cada par de caracteres hex representa un número
    let noCertificado = '';
    for (let i = 0; i < serialHex.length; i += 2) {
      const byte = parseInt(serialHex.substr(i, 2), 16);
      noCertificado += byte.toString().padStart(2, '0');
    }

    return noCertificado.slice(0, 20); // SAT usa 20 dígitos
  } catch (error) {
    console.error('Error extracting certificate number:', error);
    throw new Error('Error al extraer el número de certificado');
  }
}

/**
 * Verifica si el certificado está vigente
 */
export function isCertificateValid(certificatePem: string): {
  valid: boolean;
  message?: string;
  validFrom?: Date;
  validTo?: Date;
} {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const now = new Date();
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    const isValid = now >= validFrom && now <= validTo;

    return {
      valid: isValid,
      validFrom,
      validTo,
      message: isValid ? undefined : 'El certificado ha expirado o aún no es válido'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Error al validar el certificado: formato inválido'
    };
  }
}

/**
 * Proceso completo de firma del CFDI
 */
export async function signCFDI(
  userId: string,
  xmlData: Parameters<typeof generateCadenaOriginal>[0]
): Promise<SignResult> {
  // Obtener el CSD activo
  const csd = await getActiveCSD(userId);

  if (!csd) {
    return {
      success: false,
      message: 'No se encontró un certificado CSD activo. Por favor, sube tu certificado en la configuración.'
    };
  }

  // Verificar vigencia del certificado
  if (!isCertificateValid(csd.certificate)) {
    return {
      success: false,
      message: 'El certificado CSD ha expirado o no es válido.'
    };
  }

  try {
    // Extraer número de certificado
    const noCertificado = csd.certificateNumber || extractCertificateNumber(csd.certificate);

    // Actualizar el noCertificado en los datos del XML
    xmlData.noCertificado = noCertificado;

    // Generar cadena original
    const cadenaOriginal = generateCadenaOriginal(xmlData);

    // Firmar la cadena original
    const sello = signCadenaOriginal(cadenaOriginal, csd.privateKey);

    // Obtener certificado en Base64
    const certificado = getCertificateBase64(csd.certificate);

    return {
      success: true,
      sello,
      certificado,
      noCertificado
    };
  } catch (error) {
    console.error('Error signing CFDI:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido al firmar el CFDI';
    return {
      success: false,
      message
    };
  }
}

/**
 * Valida que la llave privada corresponda al certificado
 */
export function validateKeyPair(certificatePem: string, privateKeyPem: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

    // Crear un mensaje de prueba
    const testMessage = 'test-validation-message';
    const md = forge.md.sha256.create();
    md.update(testMessage, 'utf8');

    // Firmar con la llave privada
    const signature = privateKey.sign(md);

    // Verificar con la llave pública del certificado
    const mdVerify = forge.md.sha256.create();
    mdVerify.update(testMessage, 'utf8');

    return publicKey.verify(mdVerify.digest().bytes(), signature);
  } catch {
    return false;
  }
}
