import type { Metadata } from 'next';

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