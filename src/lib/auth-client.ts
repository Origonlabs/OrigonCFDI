'use client';

import type { User } from 'firebase/auth';

/**
 * Devuelve UID y token del usuario autenticado para invocar server actions.
 */
export async function getUserAuth(user: User | null): Promise<{ uid: string; token: string }> {
  if (!user) {
    throw new Error('Debes iniciar sesión.');
  }
  const token = await user.getIdToken();
  return { uid: user.uid, token };
}
