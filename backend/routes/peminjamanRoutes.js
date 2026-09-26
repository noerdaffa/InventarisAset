const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

// Helper: catat riwayat aset
async function catatRiwayatAset(conn, asetId, adminId, aktivitas, keterangan, dataLama, dataBaru) {
  try {
    await conn.query(
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

// ─── GET /api/peminjaman/ringkasan → ringkasan metrik statistik ─────────────────
router.get("/ringkasan", async (req, res) => {
  try {
    const [[{ total }]] = await promiseDb.query("SELECT COUNT(*) AS total FROM peminjaman");
    const [[{ menunggu }]] = await promiseDb.query(
      "SELECT COUNT(*) AS menunggu FROM peminjaman WHERE status = 'MENUNGGU'"
    );
    const [[{ disetujui }]] = await promiseDb.query(
      "SELECT COUNT(*) AS disetujui FROM peminjaman WHERE status = 'DISETUJUI'"
    );
    const [[{ dipinjam }]] = await promiseDb.query(
      "SELECT COUNT(*) AS dipinjam FROM peminjaman WHERE status = 'DIPINJAM'"
    );
    const [[{ menunggu_kembali }]] = await promiseDb.query(
      "SELECT COUNT(*) AS menunggu_kembali FROM peminjaman WHERE status = 'MENUNGGU_PENGEMBALIAN'"
    );
    const [[{ dikembalikan }]] = await promiseDb.query(
      "SELECT COUNT(*) AS dikembalikan FROM peminjaman WHERE status = 'DIKEMBALIKAN'"
    );
    const [[{ terlambat }]] = await promiseDb.query(
      `SELECT COUNT(*) AS terlambat FROM peminjaman
       WHERE status = 'DIPINJAM'
         AND tanggal_rencana_kembali IS NOT NULL
         AND tanggal_rencana_kembali < CURDATE()`
    );

    res.json({
      success: true,
      data: {
        total: total || 0,
        menunggu: menunggu || 0,
        disetujui: disetujui || 0,
        dipinjam: dipinjam || 0,
        menunggu_kembali: menunggu_kembali || 0,
        dikembalikan: dikembalikan || 0,
        terlambat: terlambat || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat ringkasan", error: err.message });
  }
});

// ─── GET /api/peminjaman/aktif-dipinjam → daftar aset yang sedang dipinjam (untuk fitur pengembalian) ───
router.get("/aktif-dipinjam", async (req, res) => {
  try {
    const { search = "" } = req.query;
    const where = ["p.status IN ('DIPINJAM', 'MENUNGGU_PENGEMBALIAN')"];
    const params = [];

    if (search) {
      where.push("(COALESCE(pg.nama, p.nip) LIKE ? OR p.nip LIKE ? OR a.nama_barang LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = "WHERE " + where.join(" AND ");

    const [rows] = await promiseDb.query(
      `SELECT
         p.id, p.nip, COALESCE(pg.nama, p.nip) AS nama_pegawai,
         p.status,
         p.tanggal_pinjam, p.tanggal_rencana_kembali, p.tanggal_kembali, p.keterangan, p.created_at,
         DATEDIFF(CURDATE(), p.tanggal_rencana_kembali) AS hari_terlambat,
         DATEDIFF(p.tanggal_rencana_kembali, CURDATE()) AS sisa_hari,
         GROUP_CONCAT(a.nama_barang ORDER BY a.id SEPARATOR ', ') AS nama_aset,
         GROUP_CONCAT(a.kode_barang ORDER BY a.id SEPARATOR ', ') AS kode_aset,
         GROUP_CONCAT(a.id ORDER BY a.id SEPARATOR ',') AS aset_ids,
         GROUP_CONCAT(IFNULL(dp.kondisi_saat_kembali, dp.kondisi_saat_pinjam) ORDER BY a.id SEPARATOR ', ') AS kondisi_laporan
       FROM peminjaman p
       LEFT JOIN pegawai pg ON p.nip = pg.nip
       JOIN detail_peminjaman dp ON dp.peminjaman_id = p.id
       JOIN aset a ON dp.aset_id = a.id
       ${whereSql}
       GROUP BY p.id
       ORDER BY CASE WHEN p.status = 'MENUNGGU_PENGEMBALIAN' THEN 0 ELSE 1 END, p.tanggal_rencana_kembali ASC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat data aset dipinjam", error: err.message });
  }
});

// ─── GET /api/peminjaman/user/:nip → riwayat peminjaman & pengembalian milik user ───
router.get("/user/:nip", async (req, res) => {
  try {
    const { status = "" } = req.query;
    const where = ["p.nip = ?"];
    const params = [req.params.nip];

    if (status) {
      where.push("p.status = ?");
      params.push(status);
    }

    const whereSql = "WHERE " + where.join(" AND ");

    const [rows] = await promiseDb.query(
      `SELECT
         p.id, p.nip, p.tanggal_pinjam, p.tanggal_rencana_kembali, p.tanggal_kembali,
         p.status, p.keterangan, p.created_at,
         GROUP_CONCAT(a.nama_barang ORDER BY a.id SEPARATOR ', ') AS nama_aset,
         GROUP_CONCAT(a.id ORDER BY a.id SEPARATOR ',') AS aset_ids,
         GROUP_CONCAT(CONCAT(a.nama_barang, ' (', IFNULL(dp.kondisi_saat_kembali, IFNULL(dp.kondisi_saat_pinjam, 'Baik')), ')') SEPARATOR '; ') AS detail_aset_kondisi
       FROM peminjaman p
       LEFT JOIN detail_peminjaman dp ON dp.peminjaman_id = p.id
       LEFT JOIN aset a ON dp.aset_id = a.id
       ${whereSql}
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat riwayat peminjaman", error: err.message });
  }
});

// ─── GET /api/peminjaman → daftar semua peminjaman (admin) ───────────────────
router.get("/", async (req, res) => {
  try {
    const { status = "", search = "", page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = [];
    const params = [];

    if (status) {
      where.push("p.status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(COALESCE(pg.nama, p.nip) LIKE ? OR p.nip LIKE ? OR a.nama_barang LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const [[{ total }]] = await promiseDb.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM peminjaman p
       LEFT JOIN pegawai pg ON p.nip = pg.nip
       LEFT JOIN detail_peminjaman dp ON dp.peminjaman_id = p.id
       LEFT JOIN aset a ON dp.aset_id = a.id
       ${whereSql}`,
      params
    );

    const [rows] = await promiseDb.query(
      `SELECT
         p.id, p.nip, COALESCE(pg.nama, p.nip) AS nama_pegawai,
         p.tanggal_pinjam, p.tanggal_rencana_kembali, p.tanggal_kembali,
         p.status, p.keterangan, p.created_at,
         GROUP_CONCAT(a.nama_barang ORDER BY a.id SEPARATOR ', ') AS nama_aset,
         GROUP_CONCAT(a.id ORDER BY a.id SEPARATOR ',') AS aset_ids,
         GROUP_CONCAT(dp.id ORDER BY a.id SEPARATOR ',') AS detail_ids
       FROM peminjaman p
       LEFT JOIN pegawai pg ON p.nip = pg.nip
       LEFT JOIN detail_peminjaman dp ON dp.peminjaman_id = p.id
       LEFT JOIN aset a ON dp.aset_id = a.id
       ${whereSql}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat data peminjaman", error: err.message });
  }
});

// ─── GET /api/peminjaman/:id → detail satu peminjaman ───────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await promiseDb.query(
      `SELECT p.*, COALESCE(pg.nama, p.nip) AS nama_pegawai
       FROM peminjaman p
       LEFT JOIN pegawai pg ON p.nip = pg.nip
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Peminjaman tidak ditemukan" });

    const [details] = await promiseDb.query(
      `SELECT dp.*, a.nama_barang, a.kode_barang, a.nup, a.kondisi AS kondisi_aset_sekarang
       FROM detail_peminjaman dp
       JOIN aset a ON dp.aset_id = a.id
       WHERE dp.peminjaman_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], detail: details } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat detail peminjaman", error: err.message });
  }
});

// ─── POST /api/peminjaman → buat pengajuan peminjaman (User atau Admin langsung) ───
router.post("/", async (req, res) => {
  const {
    nip,
    aset_ids,
    tanggal_pinjam,
    tanggal_rencana_kembali,
    keterangan,
    admin_langsung = false,
    admin_id,
  } = req.body;

  if (!nip || !aset_ids || !aset_ids.length || !tanggal_pinjam) {
    return res.status(400).json({
      success: false,
      message: "NIP pegawai, aset yang dipinjam, dan tanggal pinjam wajib diisi",
    });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // Pastikan NIP terdaftar di tabel pegawai agar foreign key fk_peminjaman_pegawai valid
    const [pgRows] = await conn.query("SELECT nip, nama FROM pegawai WHERE nip = ?", [nip]);
    if (pgRows.length === 0) {
      await conn.query(
        "INSERT IGNORE INTO pegawai (nip, nama, password) VALUES (?, ?, ?)",
        [nip, `Pegawai ${nip}`, "pegawai123"]
      );
    }

    // Periksa apakah ada aset yang sedang dipinjam
    const placeholders = aset_ids.map(() => "?").join(",");
    const [dipinjam] = await conn.query(
      `SELECT a.id, a.nama_barang FROM aset a
       JOIN detail_peminjaman dp ON dp.aset_id = a.id
       JOIN peminjaman p ON dp.peminjaman_id = p.id
       WHERE a.id IN (${placeholders}) AND p.status IN ('DISETUJUI','DIPINJAM','MENUNGGU_PENGEMBALIAN')`,
      aset_ids
    );

    if (dipinjam.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Aset berikut sedang dalam peminjaman aktif: ${dipinjam.map((a) => a.nama_barang).join(", ")}`,
      });
    }

    const initialStatus = admin_langsung ? "DIPINJAM" : "MENUNGGU";

    const [result] = await conn.query(
      "INSERT INTO peminjaman (nip, tanggal_pinjam, tanggal_rencana_kembali, keterangan, status) VALUES (?, ?, ?, ?, ?)",
      [nip, tanggal_pinjam, tanggal_rencana_kembali || null, keterangan || null, initialStatus]
    );
    const peminjamanId = result.insertId;

    // Simpan detail per aset dan catat riwayat
    for (const asetId of aset_ids) {
      const [[aset]] = await conn.query("SELECT nama_barang, kondisi FROM aset WHERE id = ?", [asetId]);
      await conn.query(
        "INSERT INTO detail_peminjaman (peminjaman_id, aset_id, kondisi_saat_pinjam) VALUES (?, ?, ?)",
        [peminjamanId, asetId, aset?.kondisi || "Baik"]
      );

      if (admin_langsung) {
        await catatRiwayatAset(
          conn,
          asetId,
          admin_id,
          "PEMINJAMAN",
          `Aset dipinjamkan langsung ke NIP ${nip}. Keperluan: ${keterangan || "-"}`,
          null,
          { status_pinjam: "DIPINJAM", nip, tanggal_pinjam }
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: admin_langsung
        ? "Peminjaman aset berhasil dicatat langsung dan berstatus DIPINJAM"
        : "Permintaan peminjaman berhasil diajukan, menunggu persetujuan admin",
      data: { id: peminjamanId },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Gagal memproses peminjaman", error: err.message });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/peminjaman/:id/setujui → admin setujui permohonan ───────────────
router.put("/:id/setujui", async (req, res) => {
  try {
    const [rows] = await promiseDb.query("SELECT * FROM peminjaman WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Peminjaman tidak ditemukan" });
    if (rows[0].status !== "MENUNGGU")
      return res.status(400).json({ success: false, message: "Hanya peminjaman berstatus MENUNGGU yang dapat disetujui" });

    await promiseDb.query("UPDATE peminjaman SET status = 'DISETUJUI' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Peminjaman berhasil disetujui" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menyetujui peminjaman", error: err.message });
  }
});

// ─── PUT /api/peminjaman/:id/tolak → admin tolak permohonan ───────────────────
router.put("/:id/tolak", async (req, res) => {
  const { alasan } = req.body;
  try {
    const [rows] = await promiseDb.query("SELECT * FROM peminjaman WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Peminjaman tidak ditemukan" });
    if (!["MENUNGGU", "DISETUJUI"].includes(rows[0].status))
      return res.status(400).json({ success: false, message: "Peminjaman tidak dapat ditolak pada status ini" });

    const newKeterangan = alasan
      ? `[DITOLAK: ${alasan}] ${rows[0].keterangan || ""}`.trim()
      : rows[0].keterangan;

    await promiseDb.query(
      "UPDATE peminjaman SET status = 'DITOLAK', keterangan = ? WHERE id = ?",
      [newKeterangan, req.params.id]
    );
    res.json({ success: true, message: "Permohonan peminjaman telah ditolak" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menolak peminjaman", error: err.message });
  }
});

// ─── PUT /api/peminjaman/:id/dipinjam → admin serahkan barang (Mulai Pinjam) ───
router.put("/:id/dipinjam", async (req, res) => {
  const { admin_id } = req.body;
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM peminjaman WHERE id = ?", [req.params.id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Peminjaman tidak ditemukan" });
    }
    if (rows[0].status !== "DISETUJUI") {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Peminjaman harus berstatus DISETUJUI terlebih dahulu" });
    }

    await conn.query("UPDATE peminjaman SET status = 'DIPINJAM' WHERE id = ?", [req.params.id]);

    // Catat riwayat penyerahan barang
    const [details] = await conn.query("SELECT aset_id FROM detail_peminjaman WHERE peminjaman_id = ?", [req.params.id]);
    for (const d of details) {
      await catatRiwayatAset(
        conn,
        d.aset_id,
        admin_id,
        "PEMINJAMAN",
        `Barang diserahkan ke peminjam NIP ${rows[0].nip}`,
        { status: "DISETUJUI" },
        { status: "DIPINJAM" }
      );
    }

    await conn.commit();
    res.json({ success: true, message: "Barang berhasil diserahkan. Status kini DIPINJAM" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Gagal memperbarui status", error: err.message });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/peminjaman/:id/ajukan-kembali → FITUR USER SUBMIT PENGEMBALIAN ASET ───
router.put("/:id/ajukan-kembali", async (req, res) => {
  const {
    nip,
    tanggal_kembali,
    kondisi_kembali = {}, // { [aset_id]: "Baik" | "Rusak Ringan" | "Rusak Berat" }
    catatan_kembali = "",
  } = req.body;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM peminjaman WHERE id = ?", [req.params.id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Data peminjaman tidak ditemukan" });
    }

    if (rows[0].status !== "DIPINJAM") {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Hanya peminjaman dengan status aktif DIPINJAM yang dapat diajukan pengembaliannya",
      });
    }

    if (nip && rows[0].nip !== nip) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: "Anda tidak berhak mengembalikan peminjaman ini" });
    }

    const tglKembali = tanggal_kembali || new Date().toISOString().slice(0, 10);
    const updatedKeterangan = catatan_kembali
      ? `${rows[0].keterangan ? rows[0].keterangan + " | " : ""}Pengajuan Kembali oleh Pegawai: ${catatan_kembali}`
      : rows[0].keterangan;

    // Ubah status ke MENUNGGU_PENGEMBALIAN
    await conn.query(
      "UPDATE peminjaman SET status = 'MENUNGGU_PENGEMBALIAN', tanggal_kembali = ?, keterangan = ? WHERE id = ?",
      [tglKembali, updatedKeterangan, req.params.id]
    );

    // Simpan kondisi saat kembali yang dilaporkan user
    if (kondisi_kembali) {
      if (typeof kondisi_kembali === "object" && !Array.isArray(kondisi_kembali)) {
        for (const [asetId, kondisi] of Object.entries(kondisi_kembali)) {
          await conn.query(
            "UPDATE detail_peminjaman SET kondisi_saat_kembali = ? WHERE peminjaman_id = ? AND aset_id = ?",
            [kondisi, req.params.id, asetId]
          );
        }
      } else if (typeof kondisi_kembali === "string") {
        await conn.query(
          "UPDATE detail_peminjaman SET kondisi_saat_kembali = ? WHERE peminjaman_id = ?",
          [kondisi_kembali, req.params.id]
        );
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: "Pengembalian aset berhasil diajukan! Silakan serahkan barang fisik ke petugas BMN untuk dicek dan diselesaikan.",
      tanggal_kembali: tglKembali,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Gagal mengajukan pengembalian", error: err.message });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/peminjaman/:id/kembalikan → ADMIN KONFIRMASI & SUBMIT PENGEMBALIAN SELESAI ───
router.put("/:id/kembalikan", async (req, res) => {
  const {
    tanggal_kembali,
    kondisi_kembali = {}, // { [aset_id]: "Baik" | "Rusak Ringan" | "Rusak Berat" }
    catatan_kembali = "",
    admin_id,
  } = req.body;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT p.*, COALESCE(pg.nama, p.nip) AS nama_pegawai
       FROM peminjaman p
       LEFT JOIN pegawai pg ON p.nip = pg.nip
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Data peminjaman tidak ditemukan" });
    }

    if (!["DIPINJAM", "MENUNGGU_PENGEMBALIAN"].includes(rows[0].status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Hanya aset dengan status DIPINJAM atau MENUNGGU_PENGEMBALIAN yang dapat diproses pengembaliannya",
      });
    }

    const tglKembali = tanggal_kembali || new Date().toISOString().slice(0, 10);
    const updatedKeterangan = catatan_kembali
      ? `${rows[0].keterangan ? rows[0].keterangan + " | " : ""}Catatan Kembali: ${catatan_kembali}`
      : rows[0].keterangan;

    // 1. Update status peminjaman jadi DIKEMBALIKAN
    await conn.query(
      "UPDATE peminjaman SET status = 'DIKEMBALIKAN', tanggal_kembali = ?, keterangan = ? WHERE id = ?",
      [tglKembali, updatedKeterangan, req.params.id]
    );

    // 2. Ambil semua aset dalam peminjaman ini
    const [details] = await conn.query(
      "SELECT dp.aset_id, a.nama_barang, a.kondisi AS kondisi_lama FROM detail_peminjaman dp JOIN aset a ON dp.aset_id = a.id WHERE dp.peminjaman_id = ?",
      [req.params.id]
    );

    // 3. Update kondisi saat kembali per aset dan kondisi tabel aset
    for (const d of details) {
      const kondisiBaru = kondisi_kembali[d.aset_id] || d.kondisi_lama || "Baik";

      await conn.query(
        "UPDATE detail_peminjaman SET kondisi_saat_kembali = ? WHERE peminjaman_id = ? AND aset_id = ?",
        [kondisiBaru, req.params.id, d.aset_id]
      );

      // Perbarui kondisi fisik pada katalog aset
      await conn.query("UPDATE aset SET kondisi = ? WHERE id = ?", [kondisiBaru, d.aset_id]);

      // Catat audit trail pengembalian di riwayat aset
      await catatRiwayatAset(
        conn,
        d.aset_id,
        admin_id,
        "PENGEMBALIAN",
        `Aset dikembalikan oleh ${rows[0].nama_pegawai} (NIP: ${rows[0].nip}). Kondisi saat kembali: ${kondisiBaru}. ${catatan_kembali ? "Catatan: " + catatan_kembali : ""}`,
        { kondisi: d.kondisi_lama, status: "DIPINJAM" },
        { kondisi: kondisiBaru, status: "TERSEDIA", tanggal_kembali: tglKembali }
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Aset berhasil dikembalikan pada tanggal ${tglKembali} dan status kembali menjadi Tersedia`,
      tanggal_kembali: tglKembali,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Gagal memproses pengembalian aset", error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
