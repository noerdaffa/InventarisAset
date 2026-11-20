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

  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, startY, { width: 50 });
    } catch (e) {
      console.warn("Gagal merender logo BMKG pada PDF:", e.message);
    }
  }

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

  const lineY = startY + 68;
  doc
    .strokeColor("#000000")
    .lineWidth(1.8)
    .moveTo(40, lineY)
    .lineTo(pageWidth - 40, lineY)
    .stroke();

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
  const pageWidth = doc.page.width;
  const totalTableWidth = columns.reduce((a, c) => a + (c.width || 0), 0);
  // Simetris: margin kiri dan kanan seimbang persis di tengah halaman (40 pt kiri & ~40.9 pt kanan)
  const startX = Math.round((pageWidth - totalTableWidth) / 2);
  let y = doc.y;
  const headerHeight = 22;
  const pageBottom = doc.page.height - 55;

  function drawHeaderRow() {
    doc.rect(startX, y, totalTableWidth, headerHeight).fill("#0d2342");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    let x = startX;
    columns.forEach((col) => {
      const padX = 4;
      const textY = y + 6.5;
      doc.text(col.label, x + padX, textY, {
        width: col.width - (padX * 2),
        align: col.align || "left",
      });

      // Garis vertikal pembatas kolom header
      doc
        .strokeColor("rgba(255, 255, 255, 0.2)")
        .lineWidth(0.5)
        .moveTo(x + col.width, y)
        .lineTo(x + col.width, y + headerHeight)
        .stroke();

      x += col.width;
    });

    // Garis horizontal bawah header
    doc
      .strokeColor("#081527")
      .lineWidth(0.8)
      .moveTo(startX, y + headerHeight)
      .lineTo(startX + totalTableWidth, y + headerHeight)
      .stroke();

    // Garis vertikal tepi kiri header
    doc
      .strokeColor("#081527")
      .lineWidth(0.5)
      .moveTo(startX, y)
      .lineTo(startX, y + headerHeight)
      .stroke();

    y += headerHeight;
  }

  // Render header tabel awal
  drawHeaderRow();

  if (!rows || rows.length === 0) {
    const emptyH = 30;
    doc.rect(startX, y, totalTableWidth, emptyH).fill("#f8fafc");
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#64748b");
    doc.text("Tidak ada data aset yang sesuai dengan kriteria filter.", startX, y + 10, {
      width: totalTableWidth,
      align: "center",
    });
    doc.strokeColor("#e2e8f0").lineWidth(0.5).rect(startX, y, totalTableWidth, emptyH).stroke();
    doc.y = y + emptyH + 12;
    return;
  }

  rows.forEach((row, idx) => {
    // 1. Hitung tinggi baris secara dinamis agar teks panjang (misal Satker / Nama Barang) tidak menumpuk
    doc.font("Helvetica").fontSize(7.5);
    let maxCellH = 0;
    columns.forEach((col, i) => {
      const textVal = String(row[i] ?? "-");
      const padX = 4;
      const cellW = col.width - (padX * 2);
      const cellH = doc.heightOfString(textVal, { width: cellW });
      if (cellH > maxCellH) maxCellH = cellH;
    });

    // Tinggi baris adaptif dengan padding simetris dan batas minimal 20pt
    const currentRowHeight = Math.max(20, Math.ceil(maxCellH + 9));

    // 2. Buat halaman baru jika baris berikutnya melampaui batas cetak halaman
    if (y + currentRowHeight > pageBottom) {
      doc.addPage({ layout: "landscape", size: "A4", margin: 40 });
      y = 45;
      drawHeaderRow();
    }

    // 3. Zebra striping latar belakang baris genap
    if (idx % 2 === 1) {
      doc.rect(startX, y, totalTableWidth, currentRowHeight).fill("#f8fafc");
    }

    // 4. Render teks setiap kolom dengan perataan vertikal yang simetris
    let x = startX;
    columns.forEach((col, i) => {
      const textVal = String(row[i] ?? "-");
      const padX = 4;
      const cellW = col.width - (padX * 2);
      const textH = doc.heightOfString(textVal, { width: cellW });
      const textY = y + Math.max(4.5, (currentRowHeight - textH) / 2);

      doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b");
      doc.text(textVal, x + padX, textY, {
        width: cellW,
        align: col.align || "left",
      });

      // Garis vertikal pembatas kolom
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .moveTo(x + col.width, y)
        .lineTo(x + col.width, y + currentRowHeight)
        .stroke();

      x += col.width;
    });

    // Garis horizontal pembatas bawah baris
    doc
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .moveTo(startX, y + currentRowHeight)
      .lineTo(startX + totalTableWidth, y + currentRowHeight)
      .stroke();

    // Garis vertikal tepi kiri tabel
    doc
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .moveTo(startX, y)
      .lineTo(startX, y + currentRowHeight)
      .stroke();

    y += currentRowHeight;
  });

  doc.y = y + 12;
}

function drawSignature(doc) {
  const pageBottom = doc.page.height - 55;
  const blockHeight = 135;
  let y = doc.y + 14;

  if (y + blockHeight > pageBottom) {
    doc.addPage({ layout: "landscape", size: "A4", margin: 40 });
    y = 45;
  }

  const blockW = 260;
  // Rata kanan sejajar garis batas tepi kanan tabel (startX + totalTableWidth = 40 + 761 = 801 pt)
  const blockX = 801 - blockW;
  const qrPath = path.join(process.cwd(), "public", "ttd-qr.png");

  const BULAN_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const now = new Date();
  const tglCetak = `Jakarta, ${now.getDate()} ${BULAN_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#1e293b")
    .text(tglCetak, blockX, y, { width: blockW, align: "center" });
  y += 14;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#0f172a")
    .text("Kepala Biro Sumber Daya Manusia dan Organisasi", blockX, y, {
      width: blockW,
      align: "center",
    });
  y += doc.heightOfString("Kepala Biro Sumber Daya Manusia dan Organisasi", { width: blockW }) + 6;

  const qrSize = 58;
  const qrX = blockX + (blockW - qrSize) / 2;
  if (fs.existsSync(qrPath)) {
    try {
      doc.image(qrPath, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 8;
    } catch (e) {
      y += 50;
    }
  } else {
    y += 50;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("#0d2342")
    .text("Mohamad Muslihhuddin, SH., MH.", blockX, y, {
      width: blockW,
      align: "center",
      underline: true,
    });
  y += 13;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#334155")
    .text("NIP. 197407101999031001", blockX, y, { width: blockW, align: "center" });

  doc.y = y + 10;
}

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
        { label: "Kode Barang", width: 68, align: "left" },
        { label: "NUP", width: 28, align: "center" },
        { label: "Nama Barang", width: 135, align: "left" },
        { label: "Satker", width: 170, align: "left" },
        { label: "Merk/Tipe", width: 80, align: "left" },
        { label: "Kondisi", width: 55, align: "center" },
        { label: "Status BMN", width: 65, align: "center" },
        { label: "Tgl Perolehan", width: 68, align: "center" },
        { label: "Nilai Perolehan", width: 92, align: "right" },
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

    // Bagian Tanggal & Tanda Tangan Elektronik (QR Code BSrE BMKG)
    drawSignature(doc);

    // Stamping Catatan Kaki BSrE resmi BMKG & Nomor Halaman pada setiap lembar
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const pageWidth = doc.page.width;
    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // Cegah auto-break / penambahan halaman phantom tak diinginkan

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
          { align: "center", width: pageWidth - 80, lineBreak: false }
        );

      if (totalPages > 1) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#555555")
          .text(`Halaman ${i + 1} dari ${totalPages}`, 40, footerY + 11, {
            align: "right",
            width: pageWidth - 80,
            lineBreak: false,
          });
      }

      doc.page.margins.bottom = oldBottom;
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Gagal membuat PDF aset", error: err.message });
    }
  }
});

module.exports = router;
