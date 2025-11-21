'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/client';
import { getUserRole } from '@/app/actions/users';
import type { UserRole } from '@/lib/roles';

interface UseUserRoleResult {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para obtener el rol del usuario actual
 */
export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError('Firebase no está configurado');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        // Pasar el email para auto-crear usuario si no existe en BD
        const result = await getUserRole(currentUser.uid, currentUser.email || undefined);
        if (result.success) {
          setRole(result.role);
          setError(null);
        } else {
          setError(result.message);
          setRole(null);
        }
        setLoading(false);
      } else {
        setRole(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { role, loading, error };
}

