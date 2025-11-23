import type {Metadata} from 'next';
import { Red_Hat_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import TidioChat from '@/components/tidio-chat';

const redHatDisplay = Red_Hat_Display({
  subsets: ['latin'],
  variable: '--font-red-hat-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Origon CFDI',
  description: 'Plataforma de facturación electrónica y timbrado CFDI 4.0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning={true} className={redHatDisplay.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>

        <TidioChat />
      </body>
    </html>
  );
}
