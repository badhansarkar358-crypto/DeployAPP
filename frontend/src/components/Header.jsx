import React from 'react';

export default function Header() {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  return (
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold text-accent tracking-wide mb-1">MAA TARA LOTTERY AGENCIES</h1>
      <div className="text-lg font-semibold text-gray-700">Mr. Sahadeb Roy</div>
      <div className="text-sm text-gray-500">{today}</div>
    </div>
  );
}
