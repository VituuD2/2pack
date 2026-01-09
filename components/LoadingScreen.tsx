'use client';
import React from 'react';
import { AuroraBackground } from '@/components/AuroraBackground';

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-black relative">
    <AuroraBackground />
    <div className="z-10 flex flex-col items-center gap-4">
      {/* A subtle Glass-style loader */}
      <div className="w-12 h-12 border-4 border-white/10 border-t-[var(--aurora-1)] rounded-full animate-spin" />
      <p className="text-[var(--text-secondary)] font-medium animate-pulse">
        Initializing 2pack...
      </p>
    </div>
  </div>
);

export default LoadingScreen;
