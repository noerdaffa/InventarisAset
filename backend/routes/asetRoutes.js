const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

// Helper: catat riwayat perubahan aset
async function catatRiwayat(asetId, adminId, aktivitas, keterangan, dataLama, dataBaru) {
  try {
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
    console.error("Gagal mencatat riwayat aset:", e.message);
  }
}

// GET /api/aset -> list + pencarian + filter + pagination
router.get("/", async (req, res) => {
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
        "(nama_barang LIKE ? OR kode_barang LIKE ? OR nama_satker LIKE ? OR merk LIKE ? OR tipe LIKE ? OR nama LIKE ? OR CAST(nup AS CHAR) LIKE ?)"
      );
      for (let i = 0; i < 7; i++) params.push(`%${search}%`);
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

    const [rows] = await promiseDb.query(
      `SELECT ${selectFields} FROM aset a ${whereSql} ORDER BY a.${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [countRows] = await promiseDb.query(
      `SELECT COUNT(*) AS total FROM aset a ${whereSql}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limitNum) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data aset", error: err.message });
  }
});

// GET /api/aset/ringkasan-status -> ringkasan statistik aset & peminjaman
router.get("/ringkasan-status", async (req, res) => {
  try {
    const [[{ total_aset }]] = await promiseDb.query("SELECT COUNT(*) AS total_aset FROM aset");
    const [[{ aset_dipinjam }]] = await promiseDb.query(
      `SELECT COUNT(DISTINCT dp.aset_id) AS aset_dipinjam
       FROM detail_peminjaman dp
       JOIN peminjaman p ON dp.peminjaman_id = p.id
       WHERE p.status IN ('DIPINJAM', 'MENUNGGU_PENGEMBALIAN')`
    );
    const [[{ peminjaman_menunggu }]] = await promiseDb.query(
      "SELECT COUNT(*) AS peminjaman_menunggu FROM peminjaman WHERE status = 'MENUNGGU'"
    );
    const [[{ pengembalian_menunggu }]] = await promiseDb.query(
      "SELECT COUNT(*) AS pengembalian_menunggu FROM peminjaman WHERE status = 'MENUNGGU_PENGEMBALIAN'"
    );
    const [[{ pengembalian_selesai }]] = await promiseDb.query(
      "SELECT COUNT(*) AS pengembalian_selesai FROM peminjaman WHERE status = 'DIKEMBALIKAN'"
    );

    const total = total_aset || 0;
    const dipinjam = aset_dipinjam || 0;

    res.json({
      success: true,
      data: {
        total_aset: total,
        aset_tersedia: Math.max(total - dipinjam, 0),
        aset_dipinjam: dipinjam,
        peminjaman_menunggu: peminjaman_menunggu || 0,
        pengembalian_menunggu: pengembalian_menunggu || 0,
        pengembalian_selesai: pengembalian_selesai || 0,
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
      nama,
      tanggal_perolehan,
      nilai_perolehan,
      admin_id,
    } = req.body;

    if (!kode_barang || !nup || !nama_barang) {
      return res.status(400).json({
        success: false,
        message: "kode_barang, nup, dan nama_barang wajib diisi",
      });
    }

    const [result] = await promiseDb.query(
      `INSERT INTO aset
        (nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, nama, tanggal_perolehan, nilai_perolehan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nama_satker || null,
        kode_barang,
        nup,
        nama_barang,
        status_bmn || null,
        merk || null,
        tipe || null,
        kondisi || null,
        nama || null,
        tanggal_perolehan || null,
        nilai_perolehan || 0,
      ]
    );

    await catatRiwayat(result.insertId, admin_id, "TAMBAH", "Aset baru ditambahkan", null, req.body);

    res.status(201).json({ success: true, message: "Aset berhasil ditambahkan", data: { id: result.insertId } });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Kombinasi kode barang & NUP sudah ada" });
    }
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
      nama,
      tanggal_perolehan,
      nilai_perolehan,
      admin_id,
    } = req.body;

    await promiseDb.query(
      `UPDATE aset SET
        nama_satker = ?, kode_barang = ?, nup = ?, nama_barang = ?, status_bmn = ?,
        merk = ?, tipe = ?, kondisi = ?, nama = ?, tanggal_perolehan = ?, nilai_perolehan = ?
       WHERE id = ?`,
      [
        nama_satker ?? existing.nama_satker,
        kode_barang ?? existing.kode_barang,
        nup ?? existing.nup,
        nama_barang ?? existing.nama_barang,
        status_bmn ?? existing.status_bmn,
        merk ?? existing.merk,
        tipe ?? existing.tipe,
        kondisi ?? existing.kondisi,
        nama ?? existing.nama,
        tanggal_perolehan ?? existing.tanggal_perolehan,
        nilai_perolehan ?? existing.nilai_perolehan,
        id,
      ]
    );

    await catatRiwayat(id, admin_id, "EDIT", "Data aset diperbarui", existing, req.body);

    res.json({ success: true, message: "Aset berhasil diperbarui" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Kombinasi kode barang & NUP sudah ada" });
    }
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
