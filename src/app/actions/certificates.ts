"use server";

import db from "@/lib/db";
import { csdCertificates } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { encryptCSDData } from "@/lib/encryption";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";
import { validateKeyPair, extractCertificateNumber, isCertificateValid } from "@/lib/csd-signer";
import forge from 'node-forge';

/**
 * Obtiene los certificados CSD del usuario
 */
export const getCertificates = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    const certificates = await db
      .select({
        id: csdCertificates.id,
        certificateNumber: csdCertificates.certificateNumber,
        rfc: csdCertificates.rfc,
        validFrom: csdCertificates.validFrom,
        validTo: csdCertificates.validTo,
        isActive: csdCertificates.isActive,
        createdAt: csdCertificates.createdAt,
      })
      .from(csdCertificates)
      .where(eq(csdCertificates.userId, verifiedUserId))
      .orderBy(desc(csdCertificates.createdAt));

    return { success: true, data: certificates };
  } catch (error) {
    console.error("Error fetching certificates:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Sube un nuevo certificado CSD
 */
export const uploadCertificate = async (
  userId: string,
  idToken: string,
  certificateFile: string, // Base64
  keyFile: string, // Base64
  keyPassword: string
) => {
  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'manage_certificates');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para gestionar certificados." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Decodificar archivos de Base64
    const certificatePem = Buffer.from(certificateFile, 'base64').toString('utf-8');
    const keyDer = Buffer.from(keyFile, 'base64');

    // Convertir .key (DER) a PEM con contraseña
    let privateKeyPem: string;
    try {
      // Intentar descifrar la llave privada
      const p12Asn1 = forge.asn1.fromDer(keyDer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, keyPassword);

      // Obtener la llave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag];

      if (!keyBag || keyBag.length === 0) {
        throw new Error('No se encontró la llave privada en el archivo .key');
      }

      const privateKey = keyBag[0].key;
      if (!privateKey) {
        throw new Error('No se pudo extraer la llave privada');
      }

      privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    } catch (error) {
      console.error("Error decrypting key:", error);
      return { success: false, message: "Contraseña incorrecta o archivo .key inválido." };
    }

    // Validar que la llave y el certificado coincidan
    const keyPairValid = await validateKeyPair(certificatePem, privateKeyPem);
    if (!keyPairValid) {
      return { success: false, message: "El certificado y la llave privada no coinciden." };
    }

    // Extraer información del certificado
    const certNumber = await extractCertificateNumber(certificatePem);
    if (!certNumber) {
      return { success: false, message: "No se pudo extraer el número de certificado." };
    }

    // Validar vigencia del certificado
    const certInfo = await isCertificateValid(certificatePem);
    if (!certInfo.valid) {
      return { success: false, message: certInfo.message || "El certificado no es válido." };
    }

    // Extraer RFC del certificado
    const cert = forge.pki.certificateFromPem(certificatePem);
    const subject = cert.subject.attributes;
    const rfcAttr = subject.find(attr => attr.shortName === 'serialNumber' || attr.name === 'serialNumber');
    const rfcValue = rfcAttr?.value;
    const rfc = typeof rfcValue === 'string' ? rfcValue : '';

    if (!rfc) {
      return { success: false, message: "No se pudo extraer el RFC del certificado." };
    }

    // Cifrar datos sensibles
    const encryptedData = encryptCSDData({
      privateKey: privateKeyPem,
      certificate: certificatePem
    });

    // Desactivar certificados anteriores
    await db
      .update(csdCertificates)
      .set({ isActive: false })
      .where(eq(csdCertificates.userId, verifiedUserId));

    // Guardar nuevo certificado
    await db.insert(csdCertificates).values({
      userId: verifiedUserId,
      certificateNumber: String(certNumber),
      rfc: String(rfc),
      privateKey: String(encryptedData.privateKey),
      certificate: String(encryptedData.certificate),
      validFrom: certInfo.validFrom!,
      validTo: certInfo.validTo!,
      isActive: true
    });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Certificado CSD configurado exitosamente.",
      data: {
        certificateNumber: certNumber,
        rfc: rfc,
        validFrom: certInfo.validFrom,
        validTo: certInfo.validTo
      }
    };
  } catch (error) {
    console.error("Error uploading certificate:", error);
    const message = error instanceof Error ? error.message : "Error desconocido al subir el certificado.";
    return { success: false, message };
  }
};

/**
 * Desactiva un certificado CSD
 */
export const deactivateCertificate = async (
  certificateId: number,
  userId: string,
  idToken: string
) => {
  const permissionCheck = await checkUserPermission(userId, 'manage_certificates');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para gestionar certificados." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    await db
      .update(csdCertificates)
      .set({ isActive: false })
      .where(and(
        eq(csdCertificates.id, certificateId),
        eq(csdCertificates.userId, verifiedUserId)
      ));

    revalidatePath("/dashboard/settings");

    return { success: true, message: "Certificado desactivado exitosamente." };
  } catch (error) {
    console.error("Error deactivating certificate:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Activa un certificado CSD
 */
export const activateCertificate = async (
  certificateId: number,
  userId: string,
  idToken: string
) => {
  const permissionCheck = await checkUserPermission(userId, 'manage_certificates');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para gestionar certificados." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Desactivar otros certificados
    await db
      .update(csdCertificates)
      .set({ isActive: false })
      .where(eq(csdCertificates.userId, verifiedUserId));

    // Activar el seleccionado
    await db
      .update(csdCertificates)
      .set({ isActive: true })
      .where(and(
        eq(csdCertificates.id, certificateId),
        eq(csdCertificates.userId, verifiedUserId)
      ));

    revalidatePath("/dashboard/settings");

    return { success: true, message: "Certificado activado exitosamente." };
  } catch (error) {
    console.error("Error activating certificate:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};
