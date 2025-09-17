require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const sheetService = require('./sheets');
const exportUtils = require('./exportUtils');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE']
  }
});

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Socket.io real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

// Health check
app.get('/api/ping', (req, res) => res.json({ status: 'ok' }));

// Customers endpoints
app.get('/api/customers', sheetService.getCustomers);
app.post('/api/customers', sheetService.upsertCustomer);
app.delete('/api/customers/:id', sheetService.deleteCustomer);
app.post('/api/customers/:id/clear', sheetService.clearCustomer);

// Reports endpoints
app.get('/api/reports', sheetService.getReports);
app.post('/api/reports/submit', sheetService.submitReport);
app.get('/api/reports/:reportId', sheetService.getReportById);
app.delete('/api/reports/:reportId', sheetService.deleteReport);
app.post('/api/reports/clear-all', sheetService.clearAllReports);

// Export endpoints
app.get('/api/exports/report/:reportId', exportUtils.exportSingleReport);
app.post('/api/exports/range', exportUtils.exportRange);

// Socket.io broadcast on data change
sheetService.onChange = () => io.emit('update');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
