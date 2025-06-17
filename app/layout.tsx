import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { ParticlesBackground } from '@/components/ui/particles';
import { FloatingClock } from '@/components/ui/floating-clock';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Prefect Board Attendance System',
  description: 'Modern attendance tracking system for school prefects',
  openGraph: {
    images: [
      {
        url: '/Version2.png',
        width: 800,
        height: 600,
        alt: 'Prefect Board Attendance System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prefect Board Attendance System',
    description: 'Modern attendance tracking system for school prefects',
    images: [
      {
        url: '/Version2.png',
        alt: 'Prefect Board Attendance System',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://cdn.imrishmika.site/images/v2.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            <Navbar />
            <ParticlesBackground />
            <main className="flex-1 container mx-auto">{children}</main>
            
            <Footer />
            <FloatingClock />
          </div>
        </Providers>
      </body>
    </html>
  );
}