/**
 * Hook de autenticación para Firebase
 * Proporciona el usuario actual y su token de ID
 */

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface UseAuthReturn {
  user: User | null;
  idToken: string;
  loading: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
      } else {
        setIdToken('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, idToken, loading };
}
