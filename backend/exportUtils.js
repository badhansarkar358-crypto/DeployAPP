const xlsx = require('xlsx');
const pdfMake = require('pdfmake');
const puppeteer = require('puppeteer');
const sheets = require('./sheets');

// GET /api/exports/report/:reportId
exports.exportSingleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.query;
    if (!reportId) return res.status(400).json({ error: 'reportId required' });
    const { report, data } = await sheets.getReportById({ params: { reportId } }, { json: v => v });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!data || data.length === 0) return res.status(404).json({ error: 'No data in report' });
    const filename = `report_${report.reportDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      try {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Report');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buf);
      } catch (excelErr) {
        console.error('Excel export error:', excelErr);
        return res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    } else {
      try {
        const html = genReportHtml(report, data);
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(pdf);
      } catch (pdfErr) {
        console.error('PDF export error:', pdfErr);
        return res.status(500).json({ error: 'Failed to generate PDF file' });
      }
    }
  } catch (err) {
    console.error('exportSingleReport error:', err);
    res.status(500).json({ error: 'Failed to export report' });
  }
};

// POST /api/exports/range
exports.exportRange = async (req, res) => {
  try {
    const { from, to, format = 'pdf' } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    // Get all reports in range
    const { data: reports } = await sheets.getReports({ query: { month: from.slice(0, 7), page: 1, limit: 1000 } }, { json: v => v });
    const filtered = reports.filter(r => r.reportDate >= from && r.reportDate <= to);
    let allRows = [];
    for (const report of filtered) {
      const { data } = await sheets.getReportById({ params: { reportId: report.reportId } }, { json: v => v });
      allRows = allRows.concat(data.map(row => ({ ...row, reportDate: report.reportDate })));
    }
    if (allRows.length === 0) return res.status(404).json({ error: 'No data in range' });
    const filename = `reports_${from}_to_${to}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      try {
        const ws = xlsx.utils.json_to_sheet(allRows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Reports');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buf);
      } catch (excelErr) {
        console.error('Excel export error:', excelErr);
        return res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    } else {
      try {
        const html = genRangeHtml(from, to, allRows);
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(pdf);
      } catch (pdfErr) {
        console.error('PDF export error:', pdfErr);
        return res.status(500).json({ error: 'Failed to generate PDF file' });
      }
    }
  } catch (err) {
    console.error('exportRange error:', err);
    res.status(500).json({ error: 'Failed to export range' });
  }

// Helper: generate HTML for PDF export (single report)
function genReportHtml(report, data) {
  const header = Object.keys(data[0] || {});
  return `
    <html><head>
    <style>
      body { font-family: 'PT Sans', Arial, sans-serif; margin: 24px; }
      h2 { color: #800080; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
      th { background: #FFA500; color: #fff; }
      tr.total-row { font-weight: bold; background: #f5f5dc; }
      tr.negative { color: #c00; }
    </style></head><body>
    <h2>Report: ${report.reportDate}</h2>
    <table><thead><tr>
      ${header.map(h => `<th>${h}</th>`).join('')}
    </tr></thead><tbody>
      ${data.map(row => `<tr class="${parseFloat(row.total) < 0 ? 'negative' : ''}">${header.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
    </body></html>
  `;
}

// Helper: generate HTML for PDF export (range)
function genRangeHtml(from, to, rows) {
  const header = Object.keys(rows[0] || {});
  // Summary
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
  return `
    <html><head>
    <style>
      body { font-family: 'PT Sans', Arial, sans-serif; margin: 24px; }
      h2 { color: #800080; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
      th { background: #FFA500; color: #fff; }
      tr.total-row { font-weight: bold; background: #f5f5dc; }
      tr.negative { color: #c00; }
    </style></head><body>
    <h2>Reports: ${from} to ${to}</h2>
    <div><b>Total:</b> ${total.toFixed(2)}</div>
    <table><thead><tr>
      ${header.map(h => `<th>${h}</th>`).join('')}
    </tr></thead><tbody>
      ${rows.map(row => `<tr class="${parseFloat(row.total) < 0 ? 'negative' : ''}">${header.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
    </body></html>
  `;
}
};
