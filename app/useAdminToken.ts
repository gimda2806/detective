'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'detective_admin_token';

// Remembers the admin token in this browser only (localStorage), so the
// operator doesn't have to retype it on every visit. Never sent anywhere
// but the server action call itself.
export function useAdminToken() {
  const [token, setTokenState] = useState('');

  useEffect(() => {
    try {
      setTokenState(localStorage.getItem(STORAGE_KEY) || '');
    } catch {
      // localStorage unavailable (private mode, etc.) — just stay empty.
    }
  }, []);

  function setToken(value: string) {
    setTokenState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  return [token, setToken] as const;
}
