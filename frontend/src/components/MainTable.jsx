import React, { useEffect, useState } from 'react';
import Toast from './Toast';
import { FaEye, FaTrash, FaEraser, FaEdit } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const columns = [
  { key: 'name', label: 'Name', editable: true },
  { key: 'purchase', label: 'Purchase', editable: true },
  { key: 'return', label: 'Return', editable: true },
  { key: 'sell', label: 'SELL', editable: false },
  { key: 'rate_per_pc', label: 'Rate/PCS', editable: true },
  { key: 'net_value', label: 'NET VALUE', editable: false },
  { key: 'vc', label: 'VC', editable: true },
  { key: 'previous_due', label: 'Previous Due', editable: true },
  { key: 'total', label: 'TOTAL', editable: false },
  { key: 'view', label: 'View' },
  { key: 'delete', label: 'Delete' },
  { key: 'clear', label: 'Clear' }
];

function calcRow(row) {
  const purchase = Number(row.purchase) || 0;
  const ret = Number(row.return) || 0;
  const sell = purchase - ret;
  const rate = Number(row.rate_per_pc) || 0;
  const net_value = sell * rate;
  const vc = Number(row.vc) || 0;
  const prev = Number(row.previous_due) || 0;
  const total = net_value - vc + prev;
  return { ...row, sell, net_value, total };
}

export default function MainTable({ refresh }) {
  const [rows, setRows] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/customers?date=`)
      .then(r => r.json())
      .then(data => {
        setRows((data.data || data).map(calcRow));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load customers');
        setLoading(false);
      });
  }, [refresh]);

  const handleChange = (idx, key, value) => {
    setRows(rows => rows.map((row, i) =>
      i === idx ? calcRow({ ...row, [key]: value }) : row
    ));
  };

  const handleNameEdit = idx => setEditingName(idx);
  const handleNameSave = (idx, value) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, name: value } : row));
    setEditingName(null);
  };

  const handleAdd = () => {
    setLoading(true);
    fetch(`${API_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', purchase: '', return: '', rate_per_pc: '', vc: '', previous_due: '' })
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.error) setError(resp.error);
        else setRows(r => [...r, calcRow({ name: '', purchase: '', return: '', rate_per_pc: '', vc: '', previous_due: '' })]);
        setLoading(false);
      })
      .catch(() => { setError('Failed to add row'); setLoading(false); });
  };

  const handleDelete = id => {
    setLoading(true);
    fetch(`${API_URL}/api/customers/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(resp => {
        if (resp.error) setError(resp.error);
        else setRows(rows => rows.filter(r => r.id !== id));
        setLoading(false);
      })
      .catch(() => { setError('Failed to delete row'); setLoading(false); });
  };

  const handleClear = id => {
    setLoading(true);
    fetch(`${API_URL}/api/customers/${id}/clear`, { method: 'POST' })
      .then(r => r.json())
      .then(resp => {
        if (resp.error) setError(resp.error);
        else setRows(rows => rows.map(r => r.id === id ? calcRow({ ...r, purchase: '', return: '', rate_per_pc: '', vc: '', previous_due: '' }) : r));
        setLoading(false);
      })
      .catch(() => { setError('Failed to clear row'); setLoading(false); });
  };

  const handleSubmit = () => {
    setLoading(true);
    fetch(`${API_URL}/api/reports/submit`, { method: 'POST' })
      .then(r => r.json())
      .then(resp => {
        if (resp.error) setError(resp.error);
        else setSuccess('Report submitted!');
        setLoading(false);
      })
      .catch(() => { setError('Failed to submit report'); setLoading(false); });
  };

  const totals = rows.reduce((acc, row) => {
    acc.purchase += Number(row.purchase) || 0;
    acc.return += Number(row.return) || 0;
    acc.sell += Number(row.sell) || 0;
    acc.net_value += Number(row.net_value) || 0;
    acc.total += Number(row.total) || 0;
    return acc;
  }, { purchase: 0, return: 0, sell: 0, net_value: 0, total: 0 });

  return (
    <div className="overflow-x-auto mb-8">
      <table className="min-w-full text-center border rounded-lg">
        <thead>
          <tr className="bg-gradient-to-r from-primary to-accent text-white">
            {columns.map(col => (
              <th key={col.key} className="px-2 py-2 font-semibold">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id || idx} className="hover:bg-orange-50 transition-all">
              {columns.map(col => {
                if (col.key === 'view') {
                  return <td key={col.key}><button className="text-accent" title="View"><FaEye /></button></td>;
                }
                if (col.key === 'delete') {
                  return <td key={col.key}><button className="text-white bg-primary rounded px-2 py-1" title="Delete" onClick={() => handleDelete(row.id)}><FaTrash /></button></td>;
                }
                if (col.key === 'clear') {
                  return <td key={col.key}><button className="text-accent" title="Clear" onClick={() => handleClear(row.id)}><FaEraser /></button></td>;
                }
                if (col.key === 'name') {
                  return (
                    <td key={col.key} className="relative">
                      {editingName === idx ? (
                        <input
                          className="border rounded px-1 py-0.5 w-20"
                          value={row.name}
                          onChange={e => handleNameSave(idx, e.target.value)}
                          onBlur={() => setEditingName(null)}
                          autoFocus
                        />
                      ) : (
                        <span className="flex items-center gap-1">
                          {row.name}
                          <button className="text-gray-400 hover:text-accent" onClick={() => handleNameEdit(idx)}><FaEdit /></button>
                        </span>
                      )}
                    </td>
                  );
                }
                if (col.editable) {
                  return (
                    <td key={col.key}>
                      <input
                        className="border rounded px-1 py-0.5 w-16 text-center"
                        type="number"
                        value={row[col.key] || ''}
                        onChange={e => handleChange(idx, col.key, e.target.value)}
                      />
                    </td>
                  );
                }
                return <td key={col.key}>{row[col.key]}</td>;
              })}
            </tr>
          ))}
          <tr className="font-bold bg-gray-100">
            <td>Total</td>
            <td>{totals.purchase}</td>
            <td>{totals.return}</td>
            <td>{totals.sell}</td>
            <td>-</td>
            <td>{totals.net_value.toFixed(2)}</td>
            <td>-</td>
            <td>-</td>
            <td>{totals.total}</td>
            <td colSpan={3}></td>
          </tr>
        </tbody>
      </table>
      <div className="flex gap-4 mt-4">
        <button className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-orange-600 transition" onClick={handleAdd} disabled={loading} aria-label="Add Row">ADD</button>
        <button className="bg-accent text-white px-4 py-2 rounded shadow hover:bg-purple-700 transition" onClick={handleSubmit} disabled={loading} aria-label="Submit Report">Submit</button>
        {loading && <span className="ml-4 text-gray-500">Loading...</span>}
      </div>
      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}
      {success && <Toast type="success" message={success} onClose={() => setSuccess(null)} />}
    </div>
  );
}
