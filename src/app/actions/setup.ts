'use server';

import db from '@/lib/db';
import { csdCertificates } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { verifyUserRequest } from '@/lib/auth-server';

export const getSetupStatus = async (userId: string, idToken: string) => {
    if (!db) {
        return { success: false, message: "La conexión con la base de datos no está disponible.", data: { hasCsd: false } };
    }
    try {
        if (!userId) {
            return { success: false, message: "Usuario no autenticado.", data: { hasCsd: false } };
        }

        const verifiedUserId = await verifyUserRequest(userId, idToken);
        const existingCertificate = await db.select({ id: csdCertificates.id })
            .from(csdCertificates)
            .where(eq(csdCertificates.userId, verifiedUserId))
            .limit(1);

        const hasCsd = existingCertificate.length > 0;

        return { success: true, data: { hasCsd } };

    } catch (error) {
        console.error("Database Error (getSetupStatus):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        return { success: false, message: `Error al obtener el estado de la configuración: ${errorMessage}`, data: { hasCsd: false } };
    }
};

export const getCertificateDetails = async (userId: string, idToken: string) => {
    if (!db) {
        return { success: false, message: "La conexión con la base de datos no está disponible.", data: null };
    }
    try {
        if (!userId) {
            return { success: false, message: "Usuario no autenticado.", data: null };
        }

        const verifiedUserId = await verifyUserRequest(userId, idToken);
        const [certificate] = await db.select()
            .from(csdCertificates)
            .where(eq(csdCertificates.userId, verifiedUserId))
            .limit(1);
        
        return { success: true, data: certificate ?? null };

    } catch (error) {
        console.error("Database Error (getCertificateDetails):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        return { success: false, message: `Error al obtener los detalles del certificado: ${errorMessage}`, data: null };
    }
};