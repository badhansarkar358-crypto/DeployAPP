const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

let credentials;
if (SERVICE_ACCOUNT_KEY.endsWith('.json')) {
  credentials = JSON.parse(fs.readFileSync(path.resolve(SERVICE_ACCOUNT_KEY), 'utf8'));
} else {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const CURRENT_DATA_TAB = 'CurrentData';
const SAVED_REPORTS_TAB = 'SavedReports';

// Helper: get all rows from a sheet
async function getSheetRows(tab) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}`
  });
  const [header, ...rows] = res.data.values;
  return rows.map(row => Object.fromEntries(header.map((h, i) => [h, row[i] || ''])));
}

// Helper: write rows to a sheet (overwrite)
async function setSheetRows(tab, header, rows) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}`,
    valueInputOption: 'RAW',
    resource: { values: [header, ...rows.map(r => header.map(h => r[h] || ''))] }
  });
}

// GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const allRows = await getSheetRows(CURRENT_DATA_TAB);
    let filtered = allRows;
    if (date) {
      filtered = allRows.filter(r => r.date === date);
    } else if (allRows.length > 0) {
      // Get latest date
      const latestDate = allRows.reduce((max, r) => r.date > max ? r.date : max, '');
      filtered = allRows.filter(r => r.date === latestDate);
    }
    // Pagination
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paged = filtered.slice(start, end);
    res.json({
      data: paged,
      total: filtered.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('getCustomers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// POST /api/customers
exports.upsertCustomer = async (req, res) => {
  try {
    const body = req.body;
    // Field-level validation
    const errors = {};
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Name is required.';
    }
    if (body.purchase !== undefined && isNaN(parseFloat(body.purchase))) {
      errors.purchase = 'Purchase must be a number.';
    }
    if (body.return !== undefined && isNaN(parseFloat(body.return))) {
      errors.return = 'Return must be a number.';
    }
    if (body.rate_per_pc !== undefined && isNaN(parseFloat(body.rate_per_pc))) {
      errors.rate_per_pc = 'Rate/PCS must be a number.';
    }
    if (body.vc !== undefined && isNaN(parseFloat(body.vc))) {
      errors.vc = 'VC must be a number.';
    }
    if (body.previous_due !== undefined && isNaN(parseFloat(body.previous_due))) {
      errors.previous_due = 'Previous Due must be a number.';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }
    // Fetch all rows
    const rows = await getSheetRows(CURRENT_DATA_TAB);
    let row = rows.find(r => r.id === body.id);
    const now = new Date().toISOString();
    // Compute fields
    const purchase = parseFloat(body.purchase) || 0;
    const ret = parseFloat(body.return) || 0;
    const sell = purchase - ret;
    const rate = parseFloat(body.rate_per_pc) || 0;
    const net_value = sell * rate;
    const vc = parseFloat(body.vc) || 0;
    const prev_due = parseFloat(body.previous_due) || 0;
    const total = net_value - vc + prev_due;
    const date = body.date || now.slice(0, 10);
    const newRow = {
      id: row ? row.id : uuidv4(),
      name: body.name,
      purchase: purchase.toString(),
      return: ret.toString(),
      sell: sell.toString(),
      rate_per_pc: rate.toString(),
      net_value: net_value.toFixed(2),
      vc: vc.toString(),
      previous_due: prev_due.toString(),
      total: total.toFixed(2),
      date,
      created_at: row ? row.created_at : now,
      updated_at: now
    };
    let updatedRows;
    if (row) {
      updatedRows = rows.map(r => r.id === row.id ? newRow : r);
    } else {
      updatedRows = [...rows, newRow];
    }
    const header = Object.keys(newRow);
    await setSheetRows(CURRENT_DATA_TAB, header, updatedRows);
    exports.onChange();
    res.json({ success: true, row: newRow });
  } catch (err) {
    console.error('upsertCustomer error:', err);
    if (err.response && err.response.data) {
      res.status(500).json({ error: err.response.data });
    } else {
      res.status(500).json({ error: 'Failed to upsert customer' });
    }
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    let rows = await getSheetRows(CURRENT_DATA_TAB);
    rows = rows.filter(r => r.id !== id);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const header = [
      'id','name','purchase','return','sell','rate_per_pc','net_value','vc','previous_due','total','date','created_at','updated_at'
    ];
    await setSheetRows(CURRENT_DATA_TAB, header, rows);
    exports.onChange();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCustomer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// POST /api/customers/:id/clear
exports.clearCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    let rows = await getSheetRows(CURRENT_DATA_TAB);
    let found = false;
    rows = rows.map(r => {
      if (r.id === id) {
        found = true;
        return {
          ...r,
          purchase: '',
          return: '',
          sell: '',
          rate_per_pc: '',
          net_value: '',
          vc: '',
          previous_due: '',
          total: '',
          updated_at: new Date().toISOString()
        };
      }
      return r;
    });
    if (!found) return res.status(404).json({ error: 'Not found' });
    const header = [
      'id','name','purchase','return','sell','rate_per_pc','net_value','vc','previous_due','total','date','created_at','updated_at'
    ];
    await setSheetRows(CURRENT_DATA_TAB, header, rows);
    exports.onChange();
    res.json({ success: true });
  } catch (err) {
    console.error('clearCustomer error:', err);
    res.status(500).json({ error: 'Failed to clear customer' });
  }
};

// GET /api/reports
exports.getReports = async (req, res) => {
  try {
    const { month, page = 1, limit = 7 } = req.query;
    let reports = await getSheetRows(SAVED_REPORTS_TAB);
    if (month) {
      reports = reports.filter(r => r.reportDate && r.reportDate.startsWith(month));
    }
    // Sort by date desc
    reports = reports.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    // Pagination
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paged = reports.slice(start, end);
    res.json({
      data: paged,
      total: reports.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('getReports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// POST /api/reports/submit
exports.submitReport = async (req, res) => {
  try {
    // Clone CurrentData to a new sheet tab named by date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const reportId = uuidv4();
    const sheetTabName = dateStr;
    // Remove existing tab if exists (overwrite default)
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const tabExists = spreadsheet.data.sheets.some(s => s.properties.title === sheetTabName);
    if (tabExists) {
      // Delete tab
      const tabId = spreadsheet.data.sheets.find(s => s.properties.title === sheetTabName).properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
          requests: [{ deleteSheet: { sheetId: tabId } }]
        }
      });
    }
    // Copy CurrentData to new tab
    const currentRows = await getSheetRows(CURRENT_DATA_TAB);
    const header = [
      'id','name','purchase','return','sell','rate_per_pc','net_value','vc','previous_due','total','date','created_at','updated_at'
    ];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: sheetTabName }
          }
        }]
      }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetTabName}`,
      valueInputOption: 'RAW',
      resource: { values: [header, ...currentRows.map(r => header.map(h => r[h] || ''))] }
    });
    // Add to SavedReports
    let reports = await getSheetRows(SAVED_REPORTS_TAB);
    // Remove existing report for this date
    reports = reports.filter(r => r.sheetTabName !== sheetTabName);
    const reportRow = {
      reportId,
      reportDate: dateStr,
      sheetTabName,
      created_at: now.toISOString(),
      downloadLinks: ''
    };
    reports.push(reportRow);
    const reportHeader = ['reportId','reportDate','sheetTabName','created_at','downloadLinks'];
    await setSheetRows(SAVED_REPORTS_TAB, reportHeader, reports);
    exports.onChange();
    res.json({ success: true, report: reportRow });
  } catch (err) {
    console.error('submitReport error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// GET /api/reports/:reportId
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = await getSheetRows(SAVED_REPORTS_TAB);
    const report = reports.find(r => r.reportId === reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    // Get data from the report's sheet tab
    const rows = await getSheetRows(report.sheetTabName);
    res.json({ report, data: rows });
  } catch (err) {
    console.error('getReportById error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// DELETE /api/reports/:reportId
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    let reports = await getSheetRows(SAVED_REPORTS_TAB);
    const report = reports.find(r => r.reportId === reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    // Remove sheet tab
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const tab = spreadsheet.data.sheets.find(s => s.properties.title === report.sheetTabName);
    if (tab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
          requests: [{ deleteSheet: { sheetId: tab.properties.sheetId } }]
        }
      });
    }
    // Remove from SavedReports
    reports = reports.filter(r => r.reportId !== reportId);
    const reportHeader = ['reportId','reportDate','sheetTabName','created_at','downloadLinks'];
    await setSheetRows(SAVED_REPORTS_TAB, reportHeader, reports);
    exports.onChange();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteReport error:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// POST /api/reports/clear-all
exports.clearAllReports = async (req, res) => {
  try {
    // Remove all report tabs and clear SavedReports
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const reportTabs = spreadsheet.data.sheets.filter(s => s.properties.title.match(/^\d{4}-\d{2}-\d{2}$/));
    const requests = reportTabs.map(tab => ({ deleteSheet: { sheetId: tab.properties.sheetId } }));
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: { requests }
      });
    }
    // Clear SavedReports
    const reportHeader = ['reportId','reportDate','sheetTabName','created_at','downloadLinks'];
    await setSheetRows(SAVED_REPORTS_TAB, reportHeader, []);
    exports.onChange();
    res.json({ success: true });
  } catch (err) {
    console.error('clearAllReports error:', err);
    res.status(500).json({ error: 'Failed to clear all reports' });
  }
};

// Event handler for real-time updates
exports.onChange = () => {};
