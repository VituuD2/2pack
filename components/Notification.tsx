'use client';

import React from 'react';

export type NotificationType = 'success' | 'error';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50';

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-lg border text-white ${bgColor} backdrop-blur-md shadow-lg animate-fade-in-up`}>
      <div className="flex items-center justify-between">
        <p>{message}</p>
        <button onClick={onClose} className="ml-4 text-white/70 hover:text-white">&times;</button>
      </div>
    </div>
  );
};
