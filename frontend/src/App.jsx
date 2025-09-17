import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Header from './components/Header';
import MainTable from './components/MainTable';
import SavedReports from './components/SavedReports';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

export default function App() {
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    socket.on('update', () => setRefresh(r => r + 1));
    return () => socket.off('update');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-orange-400 to-purple-800">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-card p-6 mt-8 mb-8 animate-fadein transition-opacity duration-700" style={{ animation: 'fadein 1s' }}>
        <Header />
        <MainTable refresh={refresh} />
        <SavedReports refresh={refresh} />
      </div>
    </div>
  );
}
