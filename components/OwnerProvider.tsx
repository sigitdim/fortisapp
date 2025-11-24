'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type OwnerContextValue = {
  ownerId: string;
  setOwnerId: (value: string) => void;
  loadingOwner: boolean;
};

const OwnerContext = createContext<OwnerContextValue | undefined>(undefined);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerIdState] = useState<string>('');
  const [loadingOwner, setLoadingOwner] = useState<boolean>(true);

  useEffect(() => {
    try {
      let initialOwnerId = '';

      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('owner_id');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          initialOwnerId = stored;
        }
      }

      if (!initialOwnerId) {
        initialOwnerId = process.env.NEXT_PUBLIC_OWNER_ID || '';
      }

      setOwnerIdState(initialOwnerId);
    } finally {
      setLoadingOwner(false);
    }
  }, []);

  const setOwnerId = (value: string) => {
    setOwnerIdState(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('owner_id', value);
    }
  };

  const value: OwnerContextValue = {
    ownerId,
    setOwnerId,
    loadingOwner,
  };

  return (
    <OwnerContext.Provider value={value}>
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    throw new Error('useOwner must be used within an OwnerProvider');
  }
  return ctx;
}
