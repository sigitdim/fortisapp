'use client';

import { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';

type Props = PropsWithChildren<{ allow: string[] }>;

export default function ShowOnlyOnRoutes({ allow, children }: Props) {
  const pathname = usePathname();
  const path = typeof pathname === 'string' ? pathname : '';

  // Tampil hanya jika path cocok salah satu prefix di allow
  const shouldShow = allow.some((p) =>
    path === p || path.startsWith(p + '/') || path.startsWith(p)
  );

  if (!shouldShow) return null;
  return <>{children}</>;
}
