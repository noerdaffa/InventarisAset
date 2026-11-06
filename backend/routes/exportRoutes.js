const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
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
  const pageWidth = doc.page.width;
  const startY = 24;
  const logoPath = path.join(process.cwd(), "public", "logo-bmkg.png");

  // Logo BMKG resmi di sebelah kiri (sejajar margin kiri 40)
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, startY, { width: 50 });
    } catch (e) {
      console.warn("Gagal merender logo BMKG pada PDF:", e.message);
    }
  }

  // Teks Kop Surat Resmi Sesuai Format Kedinasan BMKG di PDF
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA", 40, startY + 2, {
      align: "center",
      width: pageWidth - 80,
    })
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#000000")
    .text(
      "Jl. Angkasa I No. 2, Jakarta 10610 Telp : (021) 4246321 Fax : (021) 4246703",
      40,
      startY + 23,
      { align: "center", width: pageWidth - 80 }
    );

  // Baris PO BOX & Website (dengan tautan URL berwarna biru sesuai format PDF resmi)
  const prefixText = "P. O. BOX 3540 JKT, Website : ";
  const urlText = "http://www.bmkg.go.id";
  doc.fontSize(9).font("Helvetica");
  const totalW = doc.widthOfString(prefixText + urlText);
  const startX = (pageWidth - totalW) / 2;

  doc
    .fillColor("#000000")
    .text(prefixText, startX, startY + 37, { continued: true })
    .fillColor("#0000ee")
    .text(urlText, { link: "http://www.bmkg.go.id", underline: false });

  // Garis Pembatas Kop Surat (Garis horizontal tegas melintang penuh margin kiri ke kanan)
  const lineY = startY + 68;
  doc
    .strokeColor("#000000")
    .lineWidth(1.8)
    .moveTo(40, lineY)
    .lineTo(pageWidth - 40, lineY)
    .stroke();

  // Judul Laporan & Waktu Cetak
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#0a1628")
    .text(judul, 40, lineY + 11, { align: "center", width: pageWidth - 80 })
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#666666")
    .text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 40, lineY + 27, {
      align: "center",
      width: pageWidth - 80,
    });

  doc.y = lineY + 44;
}

function drawTable(doc, columns, rows) {
  const startX = 40;
  let y = doc.y;
  const rowHeight = 20;
  const pageBottom = doc.page.height - 55;

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
      y = 45;
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
    const { search = "", kondisi = "", status_bmn = "", nama_satker = "", bulan = "" } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push("(nama_barang LIKE ? OR kode_barang LIKE ? OR nama_satker LIKE ? OR CAST(nup AS CHAR) LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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
    if (bulan) {
      if (bulan.includes("-")) {
        const parts = bulan.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          where.push("(MONTH(tanggal_perolehan) = ? AND YEAR(tanggal_perolehan) = ?)");
          params.push(m, y);
        }
      } else {
        const m = parseInt(bulan, 10);
        if (!isNaN(m)) {
          where.push("MONTH(tanggal_perolehan) = ?");
          params.push(m);
        }
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await promiseDb.query(
      `SELECT * FROM aset ${whereSql} ORDER BY nama_barang ASC`,
      params
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=laporan-aset.pdf");

    const doc = new PDFDocument({ margin: 40, layout: "landscape", size: "A4", bufferPages: true });
    doc.pipe(res);

    const BULAN_NAMES = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    let periodeLabel = "";
    if (bulan) {
      if (bulan.includes("-")) {
        const [y, m] = bulan.split("-");
        const bName = BULAN_NAMES[parseInt(m, 10) - 1] || m;
        periodeLabel = `Bulan ${bName} ${y} • `;
      } else {
        const bName = BULAN_NAMES[parseInt(bulan, 10) - 1] || bulan;
        periodeLabel = `Bulan ${bName} • `;
      }
    }

    drawHeader(doc, `Laporan Data Aset (${periodeLabel}${rows.length} item)`);

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

    // Stamping Catatan Kaki BSrE resmi BMKG & Nomor Halaman pada setiap lembar
    const range = doc.bufferedPageRange();
    const pageWidth = doc.page.width;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 35;
      doc
        .strokeColor("#000000")
        .lineWidth(0.6)
        .moveTo(40, footerY - 6)
        .lineTo(pageWidth - 40, footerY - 6)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#333333")
        .text(
          "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).",
          40,
          footerY,
          { align: "center", width: pageWidth - 80 }
        );

      if (range.count > 1) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#555555")
          .text(`Halaman ${i + 1} dari ${range.count}`, 40, footerY + 11, {
            align: "right",
            width: pageWidth - 80,
          });
      }
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Gagal membuat PDF aset", error: err.message });
    }
  }
});

module.exports = router;
