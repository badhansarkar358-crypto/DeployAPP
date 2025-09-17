import React, { useEffect } from 'react';

export default function Toast({ type = 'info', message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
      role="alert" aria-live="assertive">
      {message}
      <button className="ml-4 text-white font-bold" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}