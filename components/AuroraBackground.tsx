import React from 'react';

export const AuroraBackground: React.FC = () => {
  return (
    <div className="aurora-background fixed inset-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
      <div className="aurora-shape shape-1" />
      <div className="aurora-shape shape-2" />
      <div className="aurora-shape shape-3" />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
    </div>
  );
};