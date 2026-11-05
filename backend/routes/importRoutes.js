const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const db = require("../db");
const promiseDb = db.promisePool;

// Simpan file di memori buffer, maks 20 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isExcel =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.match(/\.(xlsx|xls|csv)$/i);

    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error("Berkas harus berformat Excel (.xlsx, .xls) atau CSV"));
    }
  },
});

// Self-healing database schema: pastikan tabel import_data dan kolom pendukung siap
let isSchemaReady = false;
let asetColumnsCache = null;

async function ensureImportSchema() {
  if (isSchemaReady) return;
  try {
    // 1. Pastikan tabel import_data ada
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS import_data (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nama_file VARCHAR(255) NOT NULL,
        jumlah_data INT NOT NULL DEFAULT 0,
        jumlah_berhasil INT NOT NULL DEFAULT 0,
        jumlah_gagal INT NOT NULL DEFAULT 0,
        admin_id INT UNSIGNED NULL,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Periksa kolom tabel aset langsung menggunakan SHOW COLUMNS (kompatibel semua versi MySQL)
    try {
      const [cols] = await promiseDb.query("SHOW COLUMNS FROM aset");
      const colNames = (cols || []).map((c) => (c.Field || "").toLowerCase());

      if (!colNames.includes("import_id")) {
        try {
          await promiseDb.query("ALTER TABLE aset ADD COLUMN import_id INT UNSIGNED NULL");
        } catch (e) {
          console.warn("Pemberitahuan schema aset.import_id:", e.message);
        }
      }

      if (!colNames.includes("jumlah_foto")) {
        try {
          await promiseDb.query("ALTER TABLE aset ADD COLUMN jumlah_foto INT DEFAULT 0");
        } catch (e) {
          console.warn("Pemberitahuan schema aset.jumlah_foto:", e.message);
        }
      }

      // Pastikan kolom admin_id di tabel aset mengizinkan NULL
      try {
        await promiseDb.query("ALTER TABLE aset MODIFY COLUMN admin_id INT UNSIGNED NULL");
      } catch (e) {}

      // Refresh kolom yang aktif di tabel aset
      const [refreshedCols] = await promiseDb.query("SHOW COLUMNS FROM aset");
      asetColumnsCache = new Set((refreshedCols || []).map((c) => (c.Field || "").toLowerCase()));
    } catch (colErr) {
      console.warn("SHOW COLUMNS warning:", colErr.message);
    }

    isSchemaReady = true;
  } catch (err) {
    console.error("ensureImportSchema warning:", err.message);
  }
}

async function getActualAsetColumns() {
  await ensureImportSchema();
  if (asetColumnsCache && asetColumnsCache.size > 0) return asetColumnsCache;
  try {
    const [cols] = await promiseDb.query("SHOW COLUMNS FROM aset");
    asetColumnsCache = new Set((cols || []).map((c) => (c.Field || "").toLowerCase()));
    return asetColumnsCache;
  } catch (e) {
    return new Set([
      "id",
      "nama_satker",
      "kode_barang",
      "nup",
      "nama_barang",
      "status_bmn",
      "merk",
      "tipe",
      "kondisi",
      "tanggal_perolehan",
      "nilai_perolehan",
    ]);
  }
}

// Ubah nilai tanggal Excel / string menjadi format standar YYYY-MM-DD
function parseTanggal(value) {
  if (!value) return null;

  // Jika serial date number dari Excel (misal: 44927)
  if (typeof value === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const mm = String(parsed.m).padStart(2, "0");
        const dd = String(parsed.d).padStart(2, "0");
        return `${parsed.y}-${mm}-${dd}`;
      }
    } catch (e) {}
  }

  const str = String(value).trim();
  if (!str) return null;

  // Jika hanya berupa tahun (contoh: 2021 atau 2023)
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  // Format YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  let m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY (format umum Indonesia)
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }

  // Fallback standar JS Date
  const asDate = new Date(str);
  if (!isNaN(asDate.getTime())) {
    const y = asDate.getFullYear();
    if (y >= 1900 && y <= 2100) {
      const mm = String(asDate.getMonth() + 1).padStart(2, "0");
      const dd = String(asDate.getDate()).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
  }

  return null;
}

// Normalisasi kondisi aset BMKG (Baik, Rusak Ringan, Rusak Berat)
function parseKondisi(value) {
  if (!value) return "Baik";
  const str = String(value).trim().toLowerCase();
  if (str.includes("berat") || str === "rb") return "Rusak Berat";
  if (str.includes("ringan") || str.includes("sedang") || str === "rr") return "Rusak Ringan";
  if (str.includes("baik") || str === "b") return "Baik";
  return "Baik";
}

// Cek apakah baris kosong / hanya kolom nomor urut
function isBlankDataRow(row, header) {
  for (let idx = 0; idx < row.length; idx++) {
    const val = String(row[idx] == null ? "" : row[idx]).trim();
    if (!val) continue;
    const hdr = header[idx] !== undefined
      ? String(header[idx]).trim().toLowerCase().replace(/[^a-z]/g, "")
      : "";
    if (hdr === "no" || hdr === "nomor" || hdr === "nourut") continue;
    return false;
  }
  return true;
}

// Ekstrak baris data dan temukan header otomatis
function buildRowsFromSheet(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!Array.isArray(rawRows) || rawRows.length === 0) return null;

  let headerIdx = -1;
  let header = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => String(c == null ? "" : c).trim());
    const joined = cells.join(" ").toLowerCase();

    // Deteksi baris header berdasarkan kata kunci umum BMN
    if (
      (joined.includes("kode") && (joined.includes("barang") || joined.includes("brg") || joined.includes("aset"))) ||
      (joined.includes("nama") && (joined.includes("barang") || joined.includes("brg") || joined.includes("aset") || joined.includes("alat"))) ||
      joined.includes("uraian barang") ||
      (joined.includes("nup") && joined.includes("nama")) ||
      (joined.includes("kode") && joined.includes("nup")) ||
      (joined.includes("barang") && joined.includes("merk")) ||
      (joined.includes("alat") && joined.includes("kondisi"))
    ) {
      headerIdx = i;
      header = cells;
      break;
    }
  }

  // Jika tidak ditemukan header spesifik di baris atas, gunakan baris pertama jika ada data
  if (headerIdx === -1 && rawRows.length > 0) {
    headerIdx = 0;
    header = rawRows[0].map((c) => String(c == null ? "" : c).trim());
  }

  if (headerIdx === -1) return null;

  const result = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    if (isBlankDataRow(row, header)) continue;

    const obj = {};
    header.forEach((h, idx) => {
      if (h) {
        obj[h] = row[idx] === undefined ? "" : row[idx];
      }
    });

    // Pastikan baris memiliki setidaknya satu nilai
    if (Object.values(obj).some((v) => String(v).trim() !== "")) {
      result.push({ rowNumber: i + 1, data: obj });
    }
  }

  return result;
}

// Ambil nilai kolom berdasarkan kandidat nama header yang mungkin (2-pass: exact + substring)
function getFieldValue(row, candidates, defaultValue = null) {
  const keys = Object.keys(row);

  // Pass 1: exact normalized match
  for (const cand of candidates) {
    const candNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const key of keys) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (keyNorm === candNorm) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }

  // Pass 2: substring normalized match (e.g. key "namabarangbmn" contains candNorm "namabarang")
  for (const cand of candidates) {
    const candNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (candNorm.length < 4) continue;
    for (const key of keys) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (keyNorm.length < 4) continue; // Mencegah false match pada header singkat seperti "no", "id", "kd"
      if (keyNorm.includes(candNorm) || candNorm.includes(keyNorm)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }

  return defaultValue;
}

// ─── GET /api/import/template → Unduh Template Excel Resmi BMKG ──────────────
router.get("/template", (req, res) => {
  try {
    const templateRows = [
      {
        "Kode Barang": "3.05.01.01.001",
        "NUP": 1,
        "Nama Barang": "Automatic Weather Station (AWS)",
        "Nama Satker": "Stasiun Meteorologi Kelas I",
        "Status BMN": "Digunakan",
        "Merk": "Vaisala",
        "Tipe": "MAWS301",
        "Kondisi": "Baik",
        "Tanggal Perolehan": "2023-01-15",
        "Nilai Perolehan": 185000000,
      },
      {
        "Kode Barang": "3.05.01.01.002",
        "NUP": 1,
        "Nama Barang": "Barometer Digital Presisi",
        "Nama Satker": "Stasiun Klimatologi",
        "Status BMN": "Digunakan",
        "Merk": "Paroscientific",
        "Tipe": "745-16B",
        "Kondisi": "Baik",
        "Tanggal Perolehan": "2023-04-10",
        "Nilai Perolehan": 48000000,
      },
      {
        "Kode Barang": "3.05.01.01.003",
        "NUP": 1,
        "Nama Barang": "Seismometer Broadband",
        "Nama Satker": "Stasiun Geofisika",
        "Status BMN": "Digunakan",
        "Merk": "Nanometrics",
        "Tipe": "Trillium 120QA",
        "Kondisi": "Rusak Ringan",
        "Tanggal Perolehan": "2022-11-20",
        "Nilai Perolehan": 95000000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);

    // Atur lebar kolom agar nyaman dibaca
    ws["!cols"] = [
      { wch: 18 }, // Kode Barang
      { wch: 8 },  // NUP
      { wch: 35 }, // Nama Barang
      { wch: 28 }, // Nama Satker
      { wch: 14 }, // Status BMN
      { wch: 16 }, // Merk
      { wch: 16 }, // Tipe
      { wch: 14 }, // Kondisi
      { wch: 18 }, // Tanggal Perolehan
      { wch: 18 }, // Nilai Perolehan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Aset BMN");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="Template_Import_Aset_BMKG.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal membuat template", error: err.message });
  }
});

// ─── POST /api/import/aset → Unggah dan Impor Berkas Excel ───────────────────
router.post("/aset", upload.single("file"), async (req, res) => {
  await ensureImportSchema();

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Pilih berkas Excel (.xlsx / .xls) untuk diimpor" });
  }

  // Verifikasi adminId yang valid, fallback ke admin pertama di sistem
  let adminId = parseInt(req.body.admin_id, 10);
  if (isNaN(adminId) || adminId <= 0) {
    adminId = null;
  } else {
    try {
      const [adm] = await promiseDb.query("SELECT id FROM admin WHERE id = ?", [adminId]);
      if (adm.length === 0) adminId = null;
    } catch (e) {
      adminId = null;
    }
  }

  if (!adminId) {
    try {
      const [allAdmins] = await promiseDb.query("SELECT id FROM admin ORDER BY id ASC LIMIT 1");
      if (allAdmins && allAdmins.length > 0) {
        adminId = allAdmins[0].id;
      }
    } catch (e) {}
  }

  const errors = [];
  let sukses = 0;
  const seenKeys = new Set();
  const importedAssets = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ success: false, message: "Berkas Excel tidak memiliki lembar kerja (sheet)" });
    }

    // Temukan lembar kerja yang memiliki baris data
    let built = null;
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const parsed = buildRowsFromSheet(sheet);
      if (parsed && parsed.length > 0) {
        built = parsed;
        break;
      }
    }

    if (!built || built.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Berkas Excel kosong atau baris judul data inventaris tidak ditemukan",
      });
    }

    // Buat entri pencatatan riwayat import
    let importId = null;
    try {
      const [importResult] = await promiseDb.query(
        `INSERT INTO import_data (nama_file, jumlah_data, jumlah_berhasil, jumlah_gagal, admin_id)
         VALUES (?, ?, ?, ?, ?)`,
        [req.file.originalname, built.length, 0, 0, adminId]
      );
      importId = importResult.insertId;
    } catch (e) {
      console.error("Gagal membuat record import_data:", e);
    }

    // Iterasi setiap baris data
    for (let i = 0; i < built.length; i++) {
      const row = built[i].data;
      const rowNumber = built[i].rowNumber;

      const rawKode = getFieldValue(row, [
        "kode_barang", "kode barang", "kd_brg", "kd brg", "kode", "kode_brg", "kd_barang",
        "kode aset", "kode_aset", "kd aset", "kodefikasi", "kode bmn", "kode_bmn",
        "no kode barang", "nomor kode barang", "no inventaris", "nomor inventaris",
        "no registrasi", "registrasi", "kode barang bmn", "kd barang bmn", "kode brg", "kd"
      ]);

      const rawNup = getFieldValue(row, [
        "nup", "no_aset", "no aset", "nomor_aset", "nomor aset", "nup_aset", "no urut pendaftaran",
        "no urut", "nourut", "no"
      ]);

      const rawNamaBarang = getFieldValue(row, [
        "nama_barang", "nama barang", "uraian_barang", "uraian barang", "ur_brg", "nama_aset",
        "nama aset", "nama", "barang", "nama alat", "nama perangkat", "alat", "perangkat",
        "deskripsi", "description", "keterangan", "item", "uraian", "uraian aset",
        "nama barang bmn", "nama brg", "jenis barang", "nama peralatan", "peralatan"
      ]);

      const merk = getFieldValue(row, ["merk", "merek", "brand", "merk / tipe", "merk_tipe"]);
      const tipe = getFieldValue(row, ["tipe", "type", "model", "seri"]);

      const nama_satker = getFieldValue(row, [
        "nama_satker", "nama satker", "satker", "uraian_satker", "uraian satker",
        "kd_satker", "unit", "unit kerja", "stasiun", "lokasi", "penempatan"
      ], "BMKG Pusat");

      const status_bmn = getFieldValue(row, [
        "status_bmn", "status bmn", "status", "status_penggunaan", "status penggunaan",
        "status aset", "status_aset", "status operasional"
      ], "Digunakan");

      const kondisiRaw = getFieldValue(row, [
        "kondisi", "kondisi_barang", "keadaan", "status kondisi", "kondisi fisik", "keadaan barang"
      ]);
      const kondisi = parseKondisi(kondisiRaw);

      const tglRaw = getFieldValue(row, [
        "tanggal_perolehan", "tanggal perolehan", "tgl_perolehan", "tgl perolehan",
        "tahun_perolehan", "tahun perolehan", "tanggal", "tahun", "tgl", "tgl beli", "tanggal beli"
      ]);
      const tanggal_perolehan = parseTanggal(tglRaw);

      const nilaiRaw = getFieldValue(row, [
        "nilai_perolehan", "nilai perolehan", "rupiah_aset", "rph_aset", "nilai",
        "nilai rp", "nilai (rp)", "harga", "harga satuan", "nilai aset", "nilai_buku", "rupiah", "total harga"
      ]);
      let nilai_perolehan = 0;
      if (nilaiRaw !== null && nilaiRaw !== undefined) {
        const cleaned = String(nilaiRaw).replace(/[^0-9.-]+/g, "");
        nilai_perolehan = parseFloat(cleaned) || 0;
      }

      // Resolusi NUP: cari kolom NUP spesifik terlebih dahulu
      let isExplicitNup = false;
      let nup = NaN;
      if (rawNup !== null && rawNup !== undefined && String(rawNup).trim() !== "") {
        const parsed = parseInt(String(rawNup).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(parsed) && parsed > 0) {
          nup = parsed;
          isExplicitNup = true;
        }
      }

      // Resolusi Kode Barang: jika tidak ada di berkas, buat format BMN standar otomatis
      let kode_barang = rawKode ? String(rawKode).trim() : "";
      if (!kode_barang) {
        kode_barang = `BMN.${String(!isNaN(nup) && nup > 0 ? nup : (i + 1)).padStart(4, "0")}`;
      }

      // Jika NUP tidak diberikan secara spesifik di berkas, cari nomor urut berikutnya di database
      if (!isExplicitNup || isNaN(nup) || nup <= 0) {
        try {
          const [maxRows] = await promiseDb.query(
            "SELECT COALESCE(MAX(nup), 0) AS max_nup FROM aset WHERE kode_barang = ?",
            [kode_barang]
          );
          const dbMaxNup = maxRows?.[0]?.max_nup || 0;
          nup = Math.max(dbMaxNup + 1, 1);
        } catch (e) {
          nup = i + 1;
        }
      }

      // Resolusi Nama Barang: jika kosong, gunakan merk/tipe atau nama default
      let nama_barang = rawNamaBarang ? String(rawNamaBarang).trim() : "";
      if (!nama_barang) {
        if (merk || tipe) {
          nama_barang = [merk, tipe].filter(Boolean).join(" ");
        } else {
          nama_barang = `Perangkat BMN #${nup}`;
        }
      }

      // Cegah benturan duplicate key dalam berkas yang sama dengan auto-increment NUP
      while (seenKeys.has(`${kode_barang}|${nup}`)) {
        nup++;
      }
      seenKeys.add(`${kode_barang}|${nup}`);

      try {
        const actualCols = await getActualAsetColumns();
        const hasImportId = actualCols.has("import_id");
        const hasAdminId = actualCols.has("admin_id");

        // Cek apakah aset dengan kode_barang dan NUP sudah terdaftar sebelumnya
        const [existing] = await promiseDb.query(
          "SELECT id FROM aset WHERE kode_barang = ? AND nup = ? LIMIT 1",
          [kode_barang, nup]
        );

        let finalAsetId = null;
        if (existing.length > 0) {
          finalAsetId = existing[0].id;
          // Lakukan pembaruan (update) data aset yang ada
          const updateSets = [
            "nama_satker = COALESCE(?, nama_satker)",
            "nama_barang = ?",
            "status_bmn = COALESCE(?, status_bmn)",
            "merk = COALESCE(?, merk)",
            "tipe = COALESCE(?, tipe)",
            "kondisi = ?",
            "tanggal_perolehan = COALESCE(?, tanggal_perolehan)",
            "nilai_perolehan = ?",
          ];
          const updateVals = [
            nama_satker ? String(nama_satker).trim() : "BMKG Pusat",
            nama_barang,
            status_bmn ? String(status_bmn).trim() : "Digunakan",
            merk ? String(merk).trim() : null,
            tipe ? String(tipe).trim() : null,
            kondisi,
            tanggal_perolehan,
            nilai_perolehan,
          ];

          if (hasImportId && importId) {
            updateSets.unshift("import_id = COALESCE(?, import_id)");
            updateVals.unshift(importId);
          }
          if (hasAdminId && adminId) {
            updateSets.unshift("admin_id = COALESCE(?, admin_id)");
            updateVals.unshift(adminId);
          }

          updateVals.push(finalAsetId);
          await promiseDb.query(
            `UPDATE aset SET ${updateSets.join(", ")} WHERE id = ?`,
            updateVals
          );
        } else {
          // Sisipkan aset baru dengan toleransi kolom dinamis
          const insertCols = [
            "nama_satker",
            "kode_barang",
            "nup",
            "nama_barang",
            "status_bmn",
            "merk",
            "tipe",
            "kondisi",
            "tanggal_perolehan",
            "nilai_perolehan",
          ];
          const insertVals = [
            nama_satker ? String(nama_satker).trim() : "BMKG Pusat",
            kode_barang,
            nup,
            nama_barang,
            status_bmn ? String(status_bmn).trim() : "Digunakan",
            merk ? String(merk).trim() : null,
            tipe ? String(tipe).trim() : null,
            kondisi,
            tanggal_perolehan,
            nilai_perolehan,
          ];

          if (hasImportId && importId) {
            insertCols.unshift("import_id");
            insertVals.unshift(importId);
          }
          if (hasAdminId) {
            insertCols.unshift("admin_id");
            insertVals.unshift(adminId);
          }

          const placeholders = insertCols.map(() => "?").join(", ");
          const [insResult] = await promiseDb.query(
            `INSERT INTO aset (${insertCols.join(", ")}) VALUES (${placeholders})`,
            insertVals
          );
          finalAsetId = insResult.insertId;
        }

        importedAssets.push({
          id: finalAsetId,
          kode_barang,
          nup,
          nama_barang,
          nama_satker: nama_satker || "BMKG Pusat",
          merk: merk || "",
          tipe: tipe || "",
          kondisi,
          tanggal_perolehan,
          nilai_perolehan,
        });

        sukses++;
      } catch (errQuery) {
        console.error(`Import error row ${rowNumber}:`, errQuery.message);
        errors.push(`Baris ${rowNumber}: ${errQuery.message}`);
      }
    }

    // Perbarui rekapitulasi riwayat import jika importId tercatat
    if (importId) {
      try {
        await promiseDb.query(
          "UPDATE import_data SET jumlah_berhasil = ?, jumlah_gagal = ? WHERE id = ?",
          [sukses, errors.length, importId]
        );
      } catch (e) {}
    }

    const isTotalFailure = sukses === 0 && built.length > 0;
    res.status(isTotalFailure ? 400 : 200).json({
      success: !isTotalFailure,
      message: isTotalFailure
        ? `Gagal mengimpor data: Seluruh ${built.length} baris data gagal diproses. Periksa rincian kendala berikut.`
        : `Impor selesai: ${sukses} berhasil, ${errors.length} catatan dari total ${built.length} baris data.`,
      data: {
        total: built.length,
        berhasil: sukses,
        gagal: errors.length,
        errors: errors.slice(0, 50),
        import_id: importId,
        asets: importedAssets,
      },
    });
  } catch (err) {
    console.error("Gagal memproses berkas Excel:", err);
    res.status(500).json({
      success: false,
      message: "Gagal membaca atau memproses berkas Excel",
      error: err.message,
    });
  }
});

// ─── GET /api/import/riwayat → Riwayat Batch Import ──────────────────────────
router.get("/riwayat", async (req, res) => {
  await ensureImportSchema();
  try {
    const [rows] = await promiseDb.query(
      `SELECT i.*, COALESCE(a.username, 'Admin') AS admin_name FROM import_data i
       LEFT JOIN admin a ON a.id = i.admin_id
       ORDER BY i.imported_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat import", error: err.message });
  }
});

// ─── GET /api/import/:id/aset → Daftar Aset dalam Satu Batch Import ──────────
router.get("/:id/aset", async (req, res) => {
  await ensureImportSchema();
  try {
    const { id } = req.params;
    const [rows] = await promiseDb.query(
      `SELECT a.*, 
        (SELECT p.status FROM detail_peminjaman dp JOIN peminjaman p ON dp.peminjaman_id = p.id WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN') LIMIT 1) AS status_pinjam
       FROM aset a
       WHERE a.import_id = ?
       ORDER BY a.id ASC LIMIT 200`,
      [id]
    );
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil daftar aset batch", error: err.message });
  }
});

// ─── DELETE /api/import/:id → Hapus Batch Import Beserta Asetnya ─────────────
router.delete("/:id", async (req, res) => {
  await ensureImportSchema();
  try {
    const { id } = req.params;

    const [importData] = await promiseDb.query("SELECT * FROM import_data WHERE id = ?", [id]);
    if (importData.length === 0) {
      return res.status(404).json({ success: false, message: "Data import tidak ditemukan" });
    }

    // Pastikan tidak ada aset dari batch ini yang sedang dipinjam
    const [activeLoan] = await promiseDb.query(
      `SELECT dp.id FROM detail_peminjaman dp
       JOIN peminjaman p ON dp.peminjaman_id = p.id
       JOIN aset a ON dp.aset_id = a.id
       WHERE a.import_id = ? AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
       LIMIT 1`,
      [id]
    );

    if (activeLoan.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Batch import tidak dapat dihapus karena terdapat aset di dalamnya yang sedang dalam peminjaman aktif",
      });
    }

    // Hitung aset yang akan dihapus
    const [[{ total }]] = await promiseDb.query("SELECT COUNT(*) as total FROM aset WHERE import_id = ?", [id]);

    if (total > 0) {
      await promiseDb.query("DELETE FROM aset WHERE import_id = ?", [id]);
    }

    await promiseDb.query("DELETE FROM import_data WHERE id = ?", [id]);

    res.json({
      success: true,
      message: `Batch import '${importData[0].nama_file}' berhasil dihapus beserta ${total} aset terkait.`,
      data: { asets_deleted: total },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus batch import: " + err.message,
      error: err.message,
    });
  }
});

module.exports = router;
