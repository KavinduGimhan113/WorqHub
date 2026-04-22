/**
 * Build a minimal .xlsx buffer from tabular rows (array of plain objects).
 */
const XLSX = require('xlsx');

function sendExcelWorkbook(res, filenameBase, sheetName, rows) {
  const safeName = String(filenameBase || 'export').replace(/[^\w.-]+/g, '_');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ _note: 'No rows' }]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Data');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
  res.send(buf);
}

module.exports = { sendExcelWorkbook };
