'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';

export default function TidioChat() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  if (isDashboard) {
    return null;
  }

  return (
    <Script
      src="//code.tidio.co/opcrppzdnebxmjjw8zykuqjwjenjmsfn.js"
      strategy="lazyOnload"
    />
  );
}
