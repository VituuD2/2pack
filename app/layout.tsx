'use client';
import './globals.css';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { AuroraBackground } from '@/components/AuroraBackground';
import { NotificationProvider } from '@/components/NotificationContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noSidebarRoutes = ['/login', '/forgot-password', '/reset-password'];
  const shouldShowSidebar = !noSidebarRoutes.includes(pathname);

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="flex h-screen w-full overflow-hidden bg-black text-white font-[Inter]">
        <NotificationProvider>
          <AuthProvider>
            <AuroraBackground />
            <AuthGuard>
              {shouldShowSidebar && <Sidebar />}
              <main className="flex-1 p-4 h-full overflow-hidden flex flex-col relative z-0">
                {children}
              </main>
            </AuthGuard>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
