import React, { useEffect, useState } from 'react';
import Toast from './Toast';
import { FaTrash, FaEye, FaFilePdf, FaFileExcel } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SavedReports({ refresh }) {
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/reports?month=`)
      .then(r => r.json())
      .then(data => {
        setReports((data.data || data));
        setLoading(false);
      })
      .catch(() => { setError('Failed to load reports'); setLoading(false); });
  }, [refresh]);

  const handleDelete = id => {
    setLoading(true);
    fetch(`${API_URL}/api/reports/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(resp => {
        if (resp.error) setError(resp.error);
        else setReports(reports => reports.filter(r => r.reportId !== id));
        setLoading(false);
      })
      .catch(() => { setError('Failed to delete report'); setLoading(false); });
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all reports?')) {
      setLoading(true);
      fetch(`${API_URL}/api/reports/clear-all`, { method: 'POST' })
        .then(r => r.json())
        .then(resp => {
          if (resp.error) setError(resp.error);
          else setReports([]);
          setLoading(false);
        })
        .catch(() => { setError('Failed to clear all reports'); setLoading(false); });
    }
  };

  const handleExport = (id, format) => {
    setSuccess('Export started...');
    window.open(`${API_URL}/api/exports/report/${id}?format=${format}`, '_blank');
  };

  const handleRangeExport = format => {
    if (!from || !to) {
      setError('Select both dates');
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/api/exports/range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, format })
    })
      .then(r => {
        if (!r.ok) throw new Error('Export failed');
        return r.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${from}_to_${to}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        setSuccess('Export complete!');
        setLoading(false);
      })
      .catch(() => { setError('Failed to export range'); setLoading(false); });
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-2">Saved Reports</h2>
  <button className="bg-orange-500 text-white px-3 py-1 rounded mb-2" onClick={handleClearAll} disabled={loading} aria-label="Clear All Reports">Clear All Reports</button>
      <table className="w-full text-center border rounded-lg mb-2">
        <thead>
          <tr className="bg-gray-200">
            <th>Date</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.reportId} className="hover:bg-orange-50 transition-all">
              <td>{r.reportDate}</td>
              <td className="flex gap-2 justify-center">
                <button title="PDF" aria-label="Download PDF" onClick={() => handleExport(r.reportId, 'pdf')}><FaFilePdf className="text-red-600" /></button>
                <button title="Excel" aria-label="Download Excel" onClick={() => handleExport(r.reportId, 'excel')}><FaFileExcel className="text-green-600" /></button>
                <button title="View" aria-label="View Report" onClick={() => window.open(`/reports/${r.reportId}`, '_blank')}><FaEye className="text-accent" /></button>
                <button title="Delete" aria-label="Delete Report" onClick={() => handleDelete(r.reportId)}><FaTrash className="text-primary" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2">
        <span>From:</span>
  <input type="date" className="border rounded px-2 py-1" value={from} onChange={e => setFrom(e.target.value)} aria-label="From Date" />
        <span>To:</span>
  <input type="date" className="border rounded px-2 py-1" value={to} onChange={e => setTo(e.target.value)} aria-label="To Date" />
  <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleRangeExport('pdf')} disabled={loading} aria-label="Download PDF">Download PDF</button>
  <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => handleRangeExport('excel')} disabled={loading} aria-label="Download Excel">Download Excel</button>
  {error && <Toast type="error" message={error} onClose={() => setError(null)} />}
  {success && <Toast type="success" message={success} onClose={() => setSuccess(null)} />}
      </div>
    </div>
  );
}
