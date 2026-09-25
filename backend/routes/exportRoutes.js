const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const db = require("../db");
const promiseDb = db.promisePool;

function formatTanggal(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRupiah(n) {
  if (!n) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function drawHeader(doc, judul) {
  doc
    .fontSize(16)
    .fillColor("#0a1628")
    .text("SISTEM INVENTARIS ASET BMKG", { align: "center" })
    .fontSize(12)
    .fillColor("#333333")
    .text(judul, { align: "center" })
    .moveDown(0.3)
    .fontSize(9)
    .fillColor("#666666")
    .text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" })
    .moveDown(1);
  doc.strokeColor("#cccccc").moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.7);
}

function drawTable(doc, columns, rows) {
  const startX = 40;
  let y = doc.y;
  const rowHeight = 20;
  const pageBottom = doc.page.height - 50;

  function drawRow(values, isHeader) {
    let x = startX;
    doc.fontSize(8).fillColor(isHeader ? "#ffffff" : "#222222");
    if (isHeader) {
      doc.rect(startX, y, columns.reduce((a, c) => a + c.width, 0), rowHeight).fill("#1e40af");
      doc.fillColor("#ffffff");
    }
    columns.forEach((col, i) => {
      doc.text(String(values[i] ?? "-"), x + 4, y + 6, { width: col.width - 8, ellipsis: true });
      x += col.width;
    });
    y += rowHeight;
  }

  drawRow(columns.map((c) => c.label), true);

  rows.forEach((row, idx) => {
    if (y + rowHeight > pageBottom) {
      doc.addPage({ layout: "landscape", margin: 40 });
      y = 50;
      drawRow(columns.map((c) => c.label), true);
    }
    if (idx % 2 === 1) {
      doc.rect(startX, y, columns.reduce((a, c) => a + c.width, 0), rowHeight).fill("#f2f5fa");
    }
    drawRow(row, false);
  });

  doc.y = y + 10;
}

// GET /api/export/aset/pdf -> export daftar aset (mendukung filter yang sama dgn /api/aset)
router.get("/aset/pdf", async (req, res) => {
  try {
    const { search = "", kondisi = "", status_bmn = "", nama_satker = "" } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push("(nama_barang LIKE ? OR kode_barang LIKE ? OR nama_satker LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (kondisi) {
      where.push("kondisi = ?");
      params.push(kondisi);
    }
    if (status_bmn) {
      where.push("status_bmn = ?");
      params.push(status_bmn);
    }
    if (nama_satker) {
      where.push("nama_satker = ?");
      params.push(nama_satker);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await promiseDb.query(
      `SELECT * FROM aset ${whereSql} ORDER BY nama_barang ASC`,
      params
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=laporan-aset.pdf");

    const doc = new PDFDocument({ margin: 40, layout: "landscape", size: "A4" });
    doc.pipe(res);

    drawHeader(doc, `Laporan Data Aset (${rows.length} item)`);

    drawTable(
      doc,
      [
        { label: "Kode Barang", width: 90 },
        { label: "NUP", width: 40 },
        { label: "Nama Barang", width: 150 },
        { label: "Satker", width: 130 },
        { label: "Merk/Tipe", width: 110 },
        { label: "Kondisi", width: 70 },
        { label: "Status BMN", width: 90 },
        { label: "Tgl Perolehan", width: 80 },
        { label: "Nilai Perolehan", width: 90 },
      ],
      rows.map((a) => [
        a.kode_barang,
        a.nup,
        a.nama_barang,
        a.nama_satker || "-",
        [a.merk, a.tipe].filter(Boolean).join(" / ") || "-",
        a.kondisi || "-",
        a.status_bmn || "-",
        formatTanggal(a.tanggal_perolehan),
        formatRupiah(a.nilai_perolehan),
      ])
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal membuat PDF aset", error: err.message });
  }
});

module.exports = router;
