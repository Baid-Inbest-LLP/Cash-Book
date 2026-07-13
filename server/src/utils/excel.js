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
  border: 'FFD1D5DB',
  black: 'FF000000',
  companyCode: 'FF13AFCD',
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

// Draw the branded header band: company code/GST (left), Shree mark (centre),
// Inbest logo (right), title + meta lines.
const addBrandedHeader = ({ workbook, worksheet, title, subtitle, meta, columns, companyInfo }) => {
  const columnCount = columns.length;
  const { inbest, shree } = getLogos();
  const inbestId = workbook.addImage({ buffer: inbest, extension: 'png' });
  const shreeId = workbook.addImage({ buffer: shree, extension: 'png' });

  for (let row = 1; row <= 3; row += 1) worksheet.getRow(row).height = 22;
  // Row 1 also carries the 30pt company code, which needs more vertical room than the logos do.
  // (Compensated below in the Inbest logo anchor so the taller row doesn't stretch the logo.)
  const HEADER_ROW1_HEIGHT = companyInfo ? 40 : 22;
  worksheet.getRow(1).height = HEADER_ROW1_HEIGHT;

  if (companyInfo) {
    const codeCell = worksheet.getCell(1, 1);
    codeCell.value = companyInfo.code || '-';
    codeCell.font = { size: 30, bold: true, color: { argb: COLORS.companyCode } };
    codeCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const gstCell = worksheet.getCell(2, 1);
    gstCell.value = `GST No.: ${companyInfo.taxId || '-'}`;
    gstCell.font = { size: 11, bold: true, color: { argb: COLORS.black } };
    gstCell.alignment = { horizontal: 'left', vertical: 'middle' };
  }

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
  // The logo's absolute height is kept constant (58.3pt, the value the original uniform
  // 22/22/22 header rows produced) by solving for br.row against the real row-1 height, so a
  // taller row 1 (to fit the company code) doesn't stretch the logo.
  const LOGO_TOP_PT = 0.2 * HEADER_ROW1_HEIGHT;
  const LOGO_HEIGHT_PT = 58.3;
  const logoBottomPt = LOGO_TOP_PT + LOGO_HEIGHT_PT;
  const inbestBrRow =
    logoBottomPt <= HEADER_ROW1_HEIGHT
      ? logoBottomPt / HEADER_ROW1_HEIGHT
      : 1 + (logoBottomPt - HEADER_ROW1_HEIGHT) / 22;
  worksheet.addImage(inbestId, {
    tl: { col: columnCount - 1, row: 0.2 },
    br: { col: columnCount, row: inbestBrRow },
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
  // Report name — a second title line, not a muted annotation, so it keeps the brand color.
  if (subtitle) addCentredLine(subtitle, { size: 13, bold: true, color: { argb: COLORS.brand } });
  for (const line of meta) addCentredLine(line, { size: 9, color: { argb: COLORS.muted } });

  return row + 1; // leave one blank spacer row before the table
};

// Auto-prepended to every export so row numbering is consistent without each report
// having to declare it.
const SNO_COLUMN = { header: 'S.No.', key: '__sno', width: 7, align: 'center' };

/**
 * Global report builder — the single entry point every export uses.
 * Produces a fully branded, styled worksheet from a column/row config.
 * A leading S.No. column is added automatically.
 *
 * @param {object}   config
 * @param {string}   config.sheetName
 * @param {string}   config.title
 * @param {string}  [config.subtitle]
 * @param {string[]}[config.meta]      - context lines (FY, filters, generated date)
 * @param {Array}    config.columns    - { header, key, width, type, align }
 * @param {Array}    config.rows       - objects keyed by column.key
 * @param {object}  [config.totals]    - keyed by column.key; rendered as a bold total row
 * @param {object}  [config.companyInfo] - { code, taxId }; shown top-left when a single
 *   company is in scope for the report
 * @returns {ExcelJS.Workbook}
 */
export const buildBrandedWorkbook = ({
  sheetName,
  title,
  subtitle,
  meta = [],
  columns: reportColumns,
  rows,
  totals,
  companyInfo,
}) => {
  const columns = [SNO_COLUMN, ...reportColumns];
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
    companyInfo,
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
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Data rows
  let rowNumber = headerRowNumber + 1;
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value = column.key === '__sno' ? rowIndex + 1 : (row[column.key] ?? null);
      applyColumnFormat(cell, column);
      cell.border = THIN_BORDER;
    });
    rowNumber += 1;
  });

  // Total row — "Total" lands under the first real column (index 1, since 0 is S.No.).
  if (totals) {
    const totalRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      if (column.key === '__sno') cell.value = null;
      else cell.value = index === 1 ? 'Total' : (totals[column.key] ?? null);
      applyColumnFormat(cell, column);
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
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
