import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../../assets');

// Brand palette (ARGB) reused across every generated sheet.
const COLORS = {
  brand: 'FF0B2F81',
  headerFill: 'FF005887',
  headerText: 'FFFFFFFF',
  muted: 'FF6B7280',
  totalFill: 'FFEFF3FB',
  border: 'FFD1D5DB',
};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

// Read the branded logos once and reuse the buffers for every export.
let logoCache = null;
const getLogos = () => {
  if (!logoCache) {
    logoCache = {
      inbest: fs.readFileSync(path.join(ASSETS_DIR, 'Inbest_Logo(Blue).png')),
      shree: fs.readFileSync(path.join(ASSETS_DIR, 'shree_red.png')),
    };
  }
  return logoCache;
};

// Apply per-column number format + alignment to a data/total cell.
const applyColumnFormat = (cell, column) => {
  switch (column.type) {
    case 'currency':
      cell.numFmt = '"₹"#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'number':
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'percent':
      cell.numFmt = '0.00"%"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'date':
      cell.numFmt = 'dd-mmm-yyyy';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      break;
    default:
      cell.alignment = { horizontal: column.align || 'left', vertical: 'middle', wrapText: true };
  }
};

// Draw the branded header band: Shree mark (centre), Inbest logo (right), title + meta lines.
const addBrandedHeader = ({ workbook, worksheet, title, subtitle, meta, columns }) => {
  const columnCount = columns.length;
  const { inbest, shree } = getLogos();
  const inbestId = workbook.addImage({ buffer: inbest, extension: 'png' });
  const shreeId = workbook.addImage({ buffer: shree, extension: 'png' });

  for (let row = 1; row <= 3; row += 1) worksheet.getRow(row).height = 22;

  // Shree mark (fixed 56px) centred on the table's mid-point. exceljs's decimal `col` setter
  // converts the fraction with a default column width (not the real one), so it mis-places
  // fractional anchors. We compute the pixel offset ourselves (exceljs uses 7px per width
  // unit, 9525 EMU per px) and pass an explicit nativeCol/nativeColOff to place it exactly.
  const SHREE_SIZE = 56;
  const EMU_PER_PX = 9525;
  const columnPixels = columns.map((column) => Math.round((column.width || 18) * 7));
  const tableWidth = columnPixels.reduce((sum, px) => sum + px, 0);
  const targetLeftPx = Math.max(0, tableWidth / 2 - SHREE_SIZE / 2);
  let accumulated = 0;
  let shreeCol = 0;
  for (let i = 0; i < columnPixels.length; i += 1) {
    if (accumulated + columnPixels[i] > targetLeftPx) {
      shreeCol = i;
      break;
    }
    accumulated += columnPixels[i];
  }
  worksheet.addImage(shreeId, {
    tl: {
      nativeCol: shreeCol,
      nativeColOff: Math.round((targetLeftPx - accumulated) * EMU_PER_PX),
      nativeRow: 0,
      nativeRowOff: 90000,
    },
    ext: { width: SHREE_SIZE, height: SHREE_SIZE },
  });

  // Inbest logo pinned to the far right. A two-cell anchor whose bottom-right corner sits on
  // the table's right border (col === columnCount) guarantees the logo never spills past the
  // table, whatever the real column widths turn out to be.
  worksheet.addImage(inbestId, {
    tl: { col: columnCount - 1, row: 0.2 },
    br: { col: columnCount, row: 2.85 },
    editAs: 'oneCell',
  });

  let row = 4;
  const addCentredLine = (value, font) => {
    worksheet.mergeCells(row, 1, row, columnCount);
    const cell = worksheet.getCell(row, 1);
    cell.value = value;
    cell.font = font;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    row += 1;
  };

  addCentredLine(title, { size: 16, bold: true, color: { argb: COLORS.brand } });
  worksheet.getRow(4).height = 24;
  if (subtitle) addCentredLine(subtitle, { size: 10, color: { argb: COLORS.muted } });
  for (const line of meta) addCentredLine(line, { size: 9, color: { argb: COLORS.muted } });

  return row + 1; // leave one blank spacer row before the table
};

/**
 * Global report builder — the single entry point every export uses.
 * Produces a fully branded, styled worksheet from a column/row config.
 *
 * @param {object}   config
 * @param {string}   config.sheetName
 * @param {string}   config.title
 * @param {string}  [config.subtitle]
 * @param {string[]}[config.meta]      - context lines (FY, filters, generated date)
 * @param {Array}    config.columns    - { header, key, width, type, align }
 * @param {Array}    config.rows       - objects keyed by column.key
 * @param {object}  [config.totals]    - keyed by column.key; rendered as a bold total row
 * @returns {ExcelJS.Workbook}
 */
export const buildBrandedWorkbook = ({
  sheetName,
  title,
  subtitle,
  meta = [],
  columns,
  rows,
  totals,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cash Book';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((column) => ({ key: column.key, width: column.width || 18 }));

  const headerRowNumber = addBrandedHeader({
    workbook,
    worksheet,
    title,
    subtitle,
    meta,
    columns,
  });

  // Table header
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 20;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
    cell.alignment = { horizontal: column.align || 'left', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Data rows
  let rowNumber = headerRowNumber + 1;
  for (const row of rows) {
    const dataRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value = row[column.key] ?? null;
      applyColumnFormat(cell, column);
      cell.border = THIN_BORDER;
    });
    rowNumber += 1;
  }

  // Total row
  if (totals) {
    const totalRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      cell.value = index === 0 ? 'Total' : (totals[column.key] ?? null);
      applyColumnFormat(cell, column);
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalFill } };
      cell.border = THIN_BORDER;
    });
  }

  worksheet.views = [{ showGridLines: false }];
  return workbook;
};

// Stream a workbook back to the client as an .xlsx download.
export const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};
