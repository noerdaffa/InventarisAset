const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

// Helper: catat riwayat perubahan aset
async function catatRiwayat(asetId, adminId, aktivitas, keterangan, dataLama, dataBaru) {
  try {
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS riwayat_aset (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        aset_id bigint unsigned DEFAULT NULL,
        admin_id int unsigned DEFAULT NULL,
        aktivitas varchar(50) DEFAULT NULL,
        keterangan text DEFAULT NULL,
        data_lama json DEFAULT NULL,
        data_baru json DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await promiseDb.query(
      `INSERT INTO riwayat_aset (aset_id, admin_id, aktivitas, keterangan, data_lama, data_baru)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        asetId,
        adminId || null,
        aktivitas,
        keterangan || null,
        dataLama ? JSON.stringify(dataLama) : null,
        dataBaru ? JSON.stringify(dataBaru) : null,
      ]
    );
  } catch (e) {
    console.error("Catat riwayat aset:", e.message);
  }
}

// Self-healing schema: pastikan tabel detail_peminjaman dan kolom pendukung siap
let isPeminjamanSchemaReady = false;
async function ensurePeminjamanSchema() {
  if (isPeminjamanSchemaReady) return;
  try {
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS detail_peminjaman (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        peminjaman_id INT UNSIGNED NOT NULL,
        aset_id INT UNSIGNED NOT NULL,
        kondisi_saat_pinjam VARCHAR(50) DEFAULT 'Baik',
        kondisi_saat_kembali VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [cols] = await promiseDb.query("SHOW COLUMNS FROM peminjaman LIKE 'tanggal_rencana_kembali'");
    if (!cols.length) {
      try {
        await promiseDb.query("ALTER TABLE peminjaman ADD COLUMN tanggal_rencana_kembali DATE NULL AFTER tanggal_pinjam");
      } catch (e) {}
    }
    isPeminjamanSchemaReady = true;
  } catch (err) {
    console.warn("Pemberitahuan schema peminjaman:", err.message);
  }
}

// GET /api/aset -> list + pencarian + filter + pagination
router.get("/", async (req, res) => {
  await ensurePeminjamanSchema();
  try {
    const {
      search = "",
      kondisi = "",
      status_bmn = "",
      nama_satker = "",
      tanggal_dari = "",
      tanggal_sampai = "",
      nilai_min = "",
      nilai_max = "",
      ketersediaan = "",
      page = 1,
      limit = 10,
      sort_by = "id",
      sort_dir = "DESC",
    } = req.query;

    const where = [];
    const params = [];

    if (search) {
      where.push(
        "(nama_barang LIKE ? OR kode_barang LIKE ? OR nama_satker LIKE ? OR merk LIKE ? OR tipe LIKE ? OR CAST(nup AS CHAR) LIKE ?)"
      );
      for (let i = 0; i < 6; i++) params.push(`%${search}%`);
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
    if (tanggal_dari) {
      where.push("tanggal_perolehan >= ?");
      params.push(tanggal_dari);
    }
    if (tanggal_sampai) {
      where.push("tanggal_perolehan <= ?");
      params.push(tanggal_sampai);
    }
    if (nilai_min) {
      where.push("nilai_perolehan >= ?");
      params.push(nilai_min);
    }
    if (nilai_max) {
      where.push("nilai_perolehan <= ?");
      params.push(nilai_max);
    }
        if (req.query.import_id) {
      try {
        const [cols] = await promiseDb.query("SHOW COLUMNS FROM aset LIKE 'import_id'");
        if (cols && cols.length > 0) {
          where.push("a.import_id = ?");
          params.push(req.query.import_id);
        }
      } catch (e) {}
    }
    if (ketersediaan === "tersedia") {
      where.push(
        "NOT EXISTS (SELECT 1 FROM detail_peminjaman dp JOIN peminjaman p ON dp.peminjaman_id = p.id WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN'))"
      );
    } else if (ketersediaan === "dipinjam") {
      where.push(
        "EXISTS (SELECT 1 FROM detail_peminjaman dp JOIN peminjaman p ON dp.peminjaman_id = p.id WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN'))"
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const allowedSort = [
      "id",
      "nama_barang",
      "kode_barang",
      "kondisi",
      "status_bmn",
      "tanggal_perolehan",
      "nilai_perolehan",
    ];
    const sortColumn = allowedSort.includes(sort_by) ? sort_by : "id";
    const sortDirection = sort_dir.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const selectFields = `
      a.*,
      (
        SELECT p.status
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS status_pinjam,
      (
        SELECT COALESCE(pg.nama, p.nip)
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        LEFT JOIN pegawai pg ON p.nip = pg.nip
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS peminjam_nama,
      (
        SELECT p.nip
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS peminjam_nip,
      (
        SELECT p.id
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS peminjaman_id,
      (
        SELECT p.tanggal_pinjam
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS pinjam_tanggal,
      (
        SELECT p.tanggal_rencana_kembali
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS pinjam_rencana_kembali,
      (
        SELECT p.tanggal_kembali
        FROM detail_peminjaman dp
        JOIN peminjaman p ON dp.peminjaman_id = p.id
        WHERE dp.aset_id = a.id AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
        ORDER BY p.id DESC LIMIT 1
      ) AS pinjam_tanggal_kembali
    `;

    let rows = [];
    let total = 0;

    try {
      const [resultRows] = await promiseDb.query(
        `SELECT ${selectFields} FROM aset a ${whereSql} ORDER BY a.${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );
      const [countRows] = await promiseDb.query(
        `SELECT COUNT(*) AS total FROM aset a ${whereSql}`,
        params
      );
      rows = resultRows;
      total = countRows[0]?.total || 0;
    } catch (errSubquery) {
      console.warn("Subquery aset gagal, beralih ke query langsung:", errSubquery.message);
      const [fallbackRows] = await promiseDb.query(
        `SELECT a.* FROM aset a ${whereSql} ORDER BY a.${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );
      const [countRows] = await promiseDb.query(
        `SELECT COUNT(*) AS total FROM aset a ${whereSql}`,
        params
      );
      rows = fallbackRows;
      total = countRows[0]?.total || 0;
    }

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data aset", error: err.message });
  }
});

// GET /api/aset/ringkasan-status -> ringkasan statistik aset & peminjaman
router.get("/ringkasan-status", async (req, res) => {
  await ensurePeminjamanSchema();
  try {
    const [[totalAsetRow]] = await promiseDb.query("SELECT COUNT(*) AS total_aset FROM aset");
    const total = totalAsetRow?.total_aset || 0;

    let dipinjam = 0;
    try {
      const [[resDipinjam]] = await promiseDb.query(
        `SELECT COUNT(DISTINCT dp.aset_id) AS aset_dipinjam
         FROM detail_peminjaman dp
         JOIN peminjaman p ON dp.peminjaman_id = p.id
         WHERE p.status IN ('DIPINJAM', 'MENUNGGU_PENGEMBALIAN')`
      );
      dipinjam = resDipinjam?.aset_dipinjam || 0;
    } catch (e) {
      try {
        const [[resDipinjamDirect]] = await promiseDb.query(
          `SELECT COUNT(DISTINCT aset_id) AS aset_dipinjam
           FROM peminjaman
           WHERE aset_id IS NOT NULL AND status IN ('DIPINJAM', 'MENUNGGU_PENGEMBALIAN')`
        );
        dipinjam = resDipinjamDirect?.aset_dipinjam || 0;
      } catch (e2) {}
    }

    let peminjaman_menunggu = 0;
    let pengembalian_menunggu = 0;
    let pengembalian_selesai = 0;

    try {
      const [[pMenunggu]] = await promiseDb.query(
        "SELECT COUNT(*) AS total FROM peminjaman WHERE status = 'MENUNGGU'"
      );
      peminjaman_menunggu = pMenunggu?.total || 0;

      const [[pKembali]] = await promiseDb.query(
        "SELECT COUNT(*) AS total FROM peminjaman WHERE status = 'MENUNGGU_PENGEMBALIAN'"
      );
      pengembalian_menunggu = pKembali?.total || 0;

      const [[pSelesai]] = await promiseDb.query(
        "SELECT COUNT(*) AS total FROM peminjaman WHERE status = 'DIKEMBALIKAN'"
      );
      pengembalian_selesai = pSelesai?.total || 0;
    } catch (e) {}

    res.json({
      success: true,
      data: {
        total_aset: total,
        aset_tersedia: Math.max(total - dipinjam, 0),
        aset_dipinjam: dipinjam,
        peminjaman_menunggu,
        pengembalian_menunggu,
        pengembalian_selesai,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat ringkasan aset", error: err.message });
  }
});

// GET /api/aset/opsi-filter -> nilai unik untuk dropdown filter
router.get("/opsi-filter", async (req, res) => {
  try {
    const [kondisi] = await promiseDb.query(
      "SELECT DISTINCT kondisi FROM aset WHERE kondisi IS NOT NULL AND kondisi <> '' ORDER BY kondisi"
    );
    const [status] = await promiseDb.query(
      "SELECT DISTINCT status_bmn FROM aset WHERE status_bmn IS NOT NULL AND status_bmn <> '' ORDER BY status_bmn"
    );
    const [satker] = await promiseDb.query(
      "SELECT DISTINCT nama_satker FROM aset WHERE nama_satker IS NOT NULL AND nama_satker <> '' ORDER BY nama_satker"
    );
    res.json({
      success: true,
      data: {
        kondisi: kondisi.map((r) => r.kondisi),
        status_bmn: status.map((r) => r.status_bmn),
        nama_satker: satker.map((r) => r.nama_satker),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil opsi filter", error: err.message });
  }
});

// GET /api/aset/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await promiseDb.query("SELECT * FROM aset WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Aset tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data aset", error: err.message });
  }
});

// POST /api/aset -> tambah aset baru
router.post("/", async (req, res) => {
  try {
    const {
      nama_satker,
      kode_barang,
      nup,
      nama_barang,
      status_bmn,
      merk,
      tipe,
      kondisi,
      tanggal_perolehan,
      nilai_perolehan,
      admin_id,
    } = req.body;

    if (!kode_barang || nup === undefined || nup === null || nup === "" || !nama_barang) {
      return res.status(400).json({
        success: false,
        message: "kode_barang, nup, dan nama_barang wajib diisi",
      });
    }

    // Validasi apakah admin_id valid di tabel admin
    let validAdminId = null;
    if (admin_id) {
      const [adminRows] = await promiseDb.query("SELECT id FROM admin WHERE id = ?", [admin_id]);
      if (adminRows.length > 0) {
        validAdminId = adminRows[0].id;
      }
    }

    const cleanKode = String(kode_barang).trim();
    const parsedNup = parseInt(nup, 10);
    if (isNaN(parsedNup)) {
      return res.status(400).json({
        success: false,
        message: "NUP harus berupa angka valid",
      });
    }

    // Cek apakah kombinasi kode_barang dan nup sudah ada
    const [dup] = await promiseDb.query(
      "SELECT id FROM aset WHERE kode_barang = ? AND nup = ?",
      [cleanKode, parsedNup]
    );
    if (dup.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Kombinasi kode barang '${cleanKode}' & NUP '${parsedNup}' sudah terdaftar`,
      });
    }

    const parsedNilai = parseFloat(nilai_perolehan) || 0;

    const [result] = await promiseDb.query(
      `INSERT INTO aset
        (admin_id, nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, tanggal_perolehan, nilai_perolehan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validAdminId,
        nama_satker ? String(nama_satker).trim() : null,
        cleanKode,
        parsedNup,
        String(nama_barang).trim(),
        status_bmn ? String(status_bmn).trim() : null,
        merk ? String(merk).trim() : null,
        tipe ? String(tipe).trim() : null,
        kondisi ? String(kondisi).trim() : "Baik",
        tanggal_perolehan || null,
        parsedNilai,
      ]
    );

    await catatRiwayat(result.insertId, validAdminId, "TAMBAH", "Aset baru ditambahkan", null, req.body);

    res.status(201).json({
      success: true,
      message: "Aset berhasil ditambahkan",
      data: { id: result.insertId },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Kombinasi kode barang & NUP sudah ada" });
    }
    console.error("Gagal menambahkan aset:", err);
    res.status(500).json({ success: false, message: "Gagal menambahkan aset", error: err.message });
  }
});

// PUT /api/aset/:id -> edit aset
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existingRows] = await promiseDb.query("SELECT * FROM aset WHERE id = ?", [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Aset tidak ditemukan" });
    }
    const existing = existingRows[0];

    const {
      nama_satker,
      kode_barang,
      nup,
      nama_barang,
      status_bmn,
      merk,
      tipe,
      kondisi,
      tanggal_perolehan,
      nilai_perolehan,
      admin_id,
    } = req.body;

    const newKode = kode_barang !== undefined ? String(kode_barang).trim() : existing.kode_barang;
    const newNup = nup !== undefined && nup !== null && nup !== "" ? parseInt(nup, 10) : existing.nup;

    if (newKode && newNup !== null && !isNaN(newNup)) {
      const [dup] = await promiseDb.query(
        "SELECT id FROM aset WHERE kode_barang = ? AND nup = ? AND id != ?",
        [newKode, newNup, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Kombinasi kode barang '${newKode}' & NUP '${newNup}' sudah digunakan oleh aset lain`,
        });
      }
    }

    let validAdminId = existing.admin_id;
    if (admin_id) {
      const [adminRows] = await promiseDb.query("SELECT id FROM admin WHERE id = ?", [admin_id]);
      if (adminRows.length > 0) {
        validAdminId = adminRows[0].id;
      }
    }

    const parsedNilai = nilai_perolehan !== undefined ? (parseFloat(nilai_perolehan) || 0) : existing.nilai_perolehan;

    await promiseDb.query(
      `UPDATE aset SET
        admin_id = ?, nama_satker = ?, kode_barang = ?, nup = ?, nama_barang = ?, status_bmn = ?,
        merk = ?, tipe = ?, kondisi = ?, tanggal_perolehan = ?, nilai_perolehan = ?
       WHERE id = ?`,
      [
        validAdminId,
        nama_satker !== undefined ? (nama_satker ? String(nama_satker).trim() : null) : existing.nama_satker,
        newKode,
        newNup,
        nama_barang !== undefined ? (nama_barang ? String(nama_barang).trim() : existing.nama_barang) : existing.nama_barang,
        status_bmn !== undefined ? (status_bmn ? String(status_bmn).trim() : null) : existing.status_bmn,
        merk !== undefined ? (merk ? String(merk).trim() : null) : existing.merk,
        tipe !== undefined ? (tipe ? String(tipe).trim() : null) : existing.tipe,
        kondisi !== undefined ? (kondisi ? String(kondisi).trim() : "Baik") : existing.kondisi,
        tanggal_perolehan !== undefined ? (tanggal_perolehan || null) : existing.tanggal_perolehan,
        parsedNilai,
        id,
      ]
    );

    await catatRiwayat(id, validAdminId, "EDIT", "Data aset diperbarui", existing, req.body);

    res.json({ success: true, message: "Aset berhasil diperbarui" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Kombinasi kode barang & NUP sudah ada" });
    }
    console.error("Gagal memperbarui aset:", err);
    res.status(500).json({ success: false, message: "Gagal memperbarui aset", error: err.message });
  }
});

// DELETE /api/aset/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = parseInt(req.body?.admin_id || req.query.admin_id, 10) || null;
    const [existingRows] = await promiseDb.query("SELECT * FROM aset WHERE id = ?", [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Aset tidak ditemukan" });
    }

    // Cek apakah aset sedang dalam peminjaman aktif
    const [activeLoan] = await promiseDb.query(
      `SELECT dp.id FROM detail_peminjaman dp
       JOIN peminjaman p ON dp.peminjaman_id = p.id
       WHERE dp.aset_id = ? AND p.status IN ('DISETUJUI', 'DIPINJAM', 'MENUNGGU_PENGEMBALIAN')
       LIMIT 1`,
      [id]
    );

    if (activeLoan.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Aset tidak dapat dihapus karena sedang dalam peminjaman aktif",
      });
    }

    await catatRiwayat(id, adminId, "HAPUS", "Aset dihapus", existingRows[0], null);

    // Jika aset berasal dari batch import, kurangi jumlah_berhasil pada riwayat import
    if (existingRows[0].import_id) {
      await promiseDb.query(
        "UPDATE import_data SET jumlah_berhasil = GREATEST(jumlah_berhasil - 1, 0) WHERE id = ?",
        [existingRows[0].import_id]
      );
    }

    await promiseDb.query("DELETE FROM aset WHERE id = ?", [id]);

    res.json({ success: true, message: "Aset berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus aset", error: err.message });
  }
});

// GET /api/aset/:id/riwayat -> riwayat perubahan satu aset
router.get("/:id/riwayat", async (req, res) => {
  try {
    const [rows] = await promiseDb.query(
      `SELECT r.*, a.username AS admin_name FROM riwayat_aset r
       LEFT JOIN admin a ON a.id = r.admin_id
       WHERE r.aset_id = ? ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat aset", error: err.message });
  }
});

module.exports = router;
