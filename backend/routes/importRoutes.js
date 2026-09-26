const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const db = require("../db");
const promiseDb = db.promisePool;

// Simpan file di memori saja, tidak perlu ditulis ke disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("File harus berformat Excel (.xlsx atau .xls)"));
    }
  },
});

// Ubah nilai tanggal Excel (serial number, string ISO, atau M/D/YY) menjadi format YYYY-MM-DD
function parseTanggal(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  const str = String(value).trim();

  // Format YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  let m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }

  // Format M/D/YY atau M/D/YYYY (umum pada ekspor BMKG)
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  }

  const asDate = new Date(str);
  if (!isNaN(asDate.getTime())) {
    return `${asDate.getFullYear()}-${String(asDate.getMonth() + 1).padStart(2, "0")}-${String(asDate.getDate()).padStart(2, "0")}`;
  }
  return null;
}

// Baris dianggap kosong jika tidak ada satu pun sel berisi, kecuali
// hanya kolom penomoran (No/Nomor) yang terisi (baris "hantu" pada ekspor BMKG).
function isBlankDataRow(row, header) {
  for (let idx = 0; idx < row.length; idx++) {
    const val = String(row[idx] == null ? "" : row[idx]).trim();
    if (!val) continue;
    const hdr = header[idx] !== undefined
      ? String(header[idx]).trim().toLowerCase().replace(/[^a-z]/g, "")
      : "";
    if (hdr === "no" || hdr === "nomor") continue;
    return false;
  }
  return true;
}

// Ubah isi sheet menjadi array { rowNumber, data }.
// Baris header dicari otomatis (bukan selalu baris 1) agar tahan terhadap
// file yang punya baris judul/kosong di atas header.
function buildRowsFromSheet(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let headerIdx = -1;
  let header = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => String(c == null ? "" : c).trim());
    const joined = cells.join(" ").toLowerCase();
    if (joined.includes("kode barang") || joined.includes("nama barang") || joined.includes("kode_barang")) {
      headerIdx = i;
      header = cells;
      break;
    }
  }

  if (headerIdx === -1) return null;

  const result = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    if (isBlankDataRow(row, header)) continue;

    const obj = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = row[idx] === undefined ? "" : row[idx];
    });
    result.push({ rowNumber: i + 1, data: obj });
  }

  return result;
}

function getFieldValue(row, candidates, defaultValue = null) {
  const keys = Object.keys(row);
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
  return defaultValue;
}

// POST /api/import/aset -> upload file excel data aset
router.post("/aset", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "File excel wajib diunggah" });
  }

  const adminId = parseInt(req.body.admin_id, 10) || null;
  const errors = [];
  let sukses = 0;
  const seenKeys = new Set();
  const goodKeys = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const built = buildRowsFromSheet(sheet);

    if (!built || built.length === 0) {
      return res.status(400).json({ success: false, message: "File excel kosong atau format tidak sesuai template" });
    }

    // Simpan record import_data dulu untuk dapatkan ID
    let importId = null;
    try {
      const [importResult] = await promiseDb.query(
        `INSERT INTO import_data (nama_file, jumlah_data, jumlah_berhasil, jumlah_gagal, admin_id)
         VALUES (?, ?, ?, ?, ?)`,
        [req.file.originalname, built.length, 0, 0, adminId]
      );
      importId = importResult.insertId;
    } catch (e) {
      return res.status(500).json({ success: false, message: "Gagal membuat record import", error: e.message });
    }

    for (let i = 0; i < built.length; i++) {
      const row = built[i].data;
      const rowNumber = built[i].rowNumber;

      const rawKode = getFieldValue(row, ["kode_barang", "kode barang", "kd_brg", "kd brg", "kode", "kode_brg"]);
      const rawNup = getFieldValue(row, ["nup", "no_aset", "no aset", "nomor_aset", "no", "nup_aset"]);
      const rawNamaBarang = getFieldValue(row, ["nama_barang", "nama barang", "uraian_barang", "uraian barang", "ur_brg", "nama_aset", "nama aset", "nama"]);
      
      const kode_barang = rawKode ? String(rawKode).trim() : "";
      const nup = rawNup ? parseInt(String(rawNup).replace(/[^0-9]/g, ""), 10) : NaN;
      const nama_barang = rawNamaBarang ? String(rawNamaBarang).trim() : "";

      if (!kode_barang || !nama_barang) {
        errors.push(`Baris ${rowNumber}: kode_barang dan nama_barang wajib diisi`);
        continue;
      }
      if (!Number.isInteger(nup) || nup <= 0) {
        errors.push(`Baris ${rowNumber}: NUP wajib diisi berupa angka`);
        continue;
      }
      const dupKey = `${kode_barang}|${nup}`;
      if (seenKeys.has(dupKey)) {
        errors.push(`Baris ${rowNumber}: kombinasi kode barang ${kode_barang} dan NUP ${nup} duplikat di dalam file yang sama`);
        continue;
      }
      seenKeys.add(dupKey);

      const nama_satker = getFieldValue(row, ["nama_satker", "nama satker", "satker", "uraian_satker", "uraian satker", "kd_satker", "unit"]);
      const status_bmn = getFieldValue(row, ["status_bmn", "status bmn", "status", "status_penggunaan", "status penggunaan"]);
      const merk = getFieldValue(row, ["merk", "merek", "merk_tipe", "merk / tipe", "brand"]);
      const tipe = getFieldValue(row, ["tipe", "type", "model", "seri"]);
      const kondisi = getFieldValue(row, ["kondisi", "kondisi_barang", "keadaan"]);
      const nama = getFieldValue(row, ["nama", "pengguna", "pemakai", "nama_pengelola", "penanggung_jawab"]);
      const tglRaw = getFieldValue(row, ["tanggal_perolehan", "tanggal perolehan", "tgl_perolehan", "tgl perolehan", "tahun_perolehan", "tahun perolehan", "tanggal"]);
      const tanggal_perolehan = parseTanggal(tglRaw);
      const nilaiRaw = getFieldValue(row, [
        "nilai_perolehan",
        "nilai perolehan",
        "rupiah_aset",
        "rph_aset",
        "nilai",
        "nilai rp",
        "nilai (rp)",
        "nilai perolehan (rp)",
        "nilai aset",
        "nilai satuan",
        "harga",
        "harga satuan",
        "nilai_buku",
        "total nilai",
      ]);
      const nilai_perolehan = parseFloat(String(nilaiRaw || 0).replace(/[^0-9.-]+/g, "")) || 0;
      const jumlahFotoRaw = getFieldValue(row, ["jumlah_foto", "jumlah foto", "jumlah"]);
      const jumlah_foto = parseInt(String(jumlahFotoRaw == null || jumlahFotoRaw === "" ? 0 : jumlahFotoRaw).replace(/[^0-9]/g, ""), 10) || 0;

      try {
        await promiseDb.query(
          `INSERT INTO aset
            (import_id, nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, nama, tanggal_perolehan, nilai_perolehan, jumlah_foto)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            import_id = VALUES(import_id),
            nama_satker = VALUES(nama_satker),
            nama_barang = VALUES(nama_barang),
            status_bmn = VALUES(status_bmn),
            merk = VALUES(merk),
            tipe = VALUES(tipe),
            kondisi = VALUES(kondisi),
            nama = VALUES(nama),
            tanggal_perolehan = VALUES(tanggal_perolehan),
            nilai_perolehan = VALUES(nilai_perolehan),
            jumlah_foto = VALUES(jumlah_foto)`,
          [
            importId,
            nama_satker || null,
            kode_barang,
            nup,
            nama_barang,
            status_bmn || null,
            merk || null,
            tipe || null,
            kondisi || null,
            nama || null,
            tanggal_perolehan,
            nilai_perolehan,
            jumlah_foto,
          ]
        );
        sukses++;
        goodKeys.push(dupKey);
      } catch (e) {
        errors.push(`Baris ${rowNumber}: ${e.message}`);
      }
    }

    // Update jumlah di import_data
    await promiseDb.query(
      `UPDATE import_data SET jumlah_berhasil = ?, jumlah_gagal = ? WHERE id = ?`,
      [sukses, errors.length, importId]
    );

    res.json({
      success: true,
      message: `Import selesai: ${sukses} berhasil, ${errors.length} gagal dari ${built.length} baris`,
      data: { total: built.length, berhasil: sukses, gagal: errors.length, errors: errors.slice(0, 50) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memproses file excel", error: err.message });
  }
});

// GET /api/import/:id/aset -> list aset dari batch import tertentu
router.get("/:id/aset", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek import_data record
    const [importData] = await promiseDb.query(
      "SELECT * FROM import_data WHERE id = ?",
      [id]
    );

    if (importData.length === 0) {
      return res.status(404).json({ success: false, message: "Data import tidak ditemukan" });
    }

    // Get aset yang berasal dari import ini
    const [asets] = await promiseDb.query(
      "SELECT * FROM aset WHERE import_id = ? ORDER BY id DESC",
      [id]
    );

    res.json({
      success: true,
      data: {
        import: importData[0],
        asets: asets,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data aset import", error: err.message });
  }
});

// DELETE /api/import/:id/aset/:asetId -> hapus aset dari batch import
router.delete("/:id/aset/:asetId", async (req, res) => {
  try {
    const { id, asetId } = req.params;

    // Verifikasi bahwa aset ini benar dari import batch ini
    const [aset] = await promiseDb.query(
      "SELECT * FROM aset WHERE id = ? AND import_id = ?",
      [asetId, id]
    );

    if (aset.length === 0) {
      return res.status(404).json({ success: false, message: "Aset tidak ditemukan atau bukan dari batch import ini" });
    }

    // Hapus aset
    await promiseDb.query("DELETE FROM aset WHERE id = ?", [asetId]);

    // Update jumlah di import_data
    await promiseDb.query(
      "UPDATE import_data SET jumlah_berhasil = jumlah_berhasil - 1 WHERE id = ?",
      [id]
    );

    res.json({ success: true, message: "Aset berhasil dihapus dari batch import" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus aset", error: err.message });
  }
});

// GET /api/import/riwayat -> riwayat proses import sebelumnya
router.get("/riwayat", async (req, res) => {
  try {
    const [rows] = await promiseDb.query(
      `SELECT i.*, a.username AS admin_name FROM import_data i
       LEFT JOIN admin a ON a.id = i.admin_id
       ORDER BY i.imported_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat import", error: err.message });
  }
});

// DELETE /api/import/:id -> hapus batch import beserta semua asetnya
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("DELETE /import/:id called with id:", id);

    // Cek import_data record
    const [importData] = await promiseDb.query(
      "SELECT * FROM import_data WHERE id = ?",
      [id]
    );

    if (importData.length === 0) {
      console.log("Import data tidak ditemukan untuk id:", id);
      return res.status(404).json({ success: false, message: "Data import tidak ditemukan" });
    }

    console.log("Import data found:", importData[0]);

    // Get total aset yang akan dihapus
    const [asetCount] = await promiseDb.query(
      "SELECT COUNT(*) as total FROM aset WHERE import_id = ?",
      [id]
    );

    console.log("Aset count:", asetCount[0].total);

    // Cek apakah ada aset dalam batch ini yang sedang dipinjam
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

    // Hapus semua aset dari batch import ini (jika ada)
    if (asetCount[0].total > 0) {
      const [deleteAsetResult] = await promiseDb.query(
        "DELETE FROM aset WHERE import_id = ?",
        [id]
      );

      console.log("Aset deleted:", deleteAsetResult.affectedRows || 0);
    }

    // Hapus record import_data
    const [deleteImportResult] = await promiseDb.query(
      "DELETE FROM import_data WHERE id = ?",
      [id]
    );

    console.log("Import data deleted:", deleteImportResult.affectedRows || 0);

    res.json({ 
      success: true, 
      message: `Batch import berhasil dihapus. ${asetCount[0].total} aset telah dihapus.`,
      data: { asets_deleted: asetCount[0].total }
    });
  } catch (err) {
    console.error("Delete batch import error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal menghapus batch import: " + err.message, 
      error: err.message,
      code: err.code 
    });
  }
});

router.buildRowsFromSheet = buildRowsFromSheet;
router.isBlankDataRow = isBlankDataRow;
router.getFieldValue = getFieldValue;
router.parseTanggal = parseTanggal;

module.exports = router;
