'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, Settings, LogOut, ScanLine, PackageSearch } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const NavButton = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    
    return (
      <Link 
        href={href}
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
          isActive 
          ? 'bg-[var(--glass-panel-bg)] border border-[var(--border-color-strong)] text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
          : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
        }`}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-64 flex flex-col p-6 glass-panel-border m-4 mr-0 rounded-2xl z-10 bg-black/40 h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="p-2 bg-[var(--aurora-1)] rounded-lg">
          <ScanLine size={24} className="text-white" />
        </div>
        <div>
           <h1 className="font-bold text-lg leading-tight">2pack</h1>
           <p className="text-xs text-[var(--text-secondary)]">WMS Lite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <NavButton href="/" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
        <NavButton href="/inbound" icon={<Box size={20}/>} label="Inbound" />
        <NavButton href="/products" icon={<PackageSearch size={20}/>} label="Products" />
      </nav>

      <div className="pt-6 border-t border-[var(--border-color-medium)] space-y-2">
        <button className="flex items-center gap-3 w-full p-3 text-[var(--text-secondary)] hover:text-white">
          <Settings size={20} /> <span>Settings</span>
        </button>
        <button className="flex items-center gap-3 w-full p-3 text-red-400 hover:text-red-300">
          <LogOut size={20} /> <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};