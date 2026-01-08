import './globals.css';
import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AuroraBackground } from '@/components/AuroraBackground';

export const metadata = {
  title: '2pack APPLICATION',
  description: 'WMS Lite for Mercado Libre FULL Inbound automation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load fonts and tailwind via CDN for simplicity in this environment. 
            In a real Next.js app, install tailwind via npm. */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="flex h-screen w-full overflow-hidden bg-black text-white font-[Inter]">
        <AuroraBackground />
        
        <Sidebar />
        
        <main className="flex-1 p-4 h-full overflow-hidden flex flex-col relative z-0">
          {children}
        </main>
      </body>
    </html>
  );
}