'use server';

import { adminAuth } from '@/lib/firebase/admin';

/**
 * Verifica que el idToken recibido corresponda al usuario indicado y devuelve el UID verificado.
 * Lanza un error si el token no es válido o si Firebase Admin no está configurado.
 */
export async function verifyUserRequest(userId: string, idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('Token de autenticación no proporcionado.');
  }

  if (!adminAuth) {
    throw new Error('Firebase Admin no está configurado en el servidor.');
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid !== userId) {
      throw new Error('El token no corresponde al usuario autenticado.');
    }
    return decoded.uid;
  } catch (error) {
    console.error('Error verifying user token:', error);
    throw new Error('No fue posible verificar la sesión del usuario.');
  }
}
