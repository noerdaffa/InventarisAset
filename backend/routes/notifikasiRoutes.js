const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

/**
 * Helper internal untuk membuat catatan notifikasi baru.
 * Dapat dipanggil langsung dari route peminjaman/pengembalian (baik di dalam transaksi conn atau pool biasa).
 */
async function buatNotifikasi(executor, { nip, judul, pesan, tipe = "PENGEMBALIAN", tautan = "/user/pengembalian" }) {
  if (!nip || !judul || !pesan) return null;
  const dbExec = executor || promiseDb;
  const sql = `
    INSERT INTO notifikasi (nip, judul, pesan, tipe, tautan, dibaca)
    VALUES (?, ?, ?, ?, ?, 0)
  `;
  const [result] = await dbExec.query(sql, [nip, judul, pesan, tipe, tautan]);
  return result.insertId;
}

// ─── GET /api/notifikasi/user/:nip ─── Ambil daftar notifikasi untuk user tertentu
router.get("/user/:nip", async (req, res) => {
  try {
    const { nip } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

    const [rows] = await promiseDb.query(
      `SELECT id, nip, judul, pesan, tipe, tautan, dibaca, created_at
       FROM notifikasi
       WHERE nip = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [nip, limit]
    );

    const [[{ unread_count }]] = await promiseDb.query(
      `SELECT COUNT(*) AS unread_count
       FROM notifikasi
       WHERE nip = ? AND dibaca = 0`,
      [nip]
    );

    res.json({
      success: true,
      data: rows,
      unread_count: Number(unread_count) || 0,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal memuat daftar notifikasi",
      error: err.message,
    });
  }
});

// ─── PUT /api/notifikasi/:id/baca ─── Tandai satu notifikasi sudah dibaca
router.put("/:id/baca", async (req, res) => {
  try {
    const { id } = req.params;
    await promiseDb.query("UPDATE notifikasi SET dibaca = 1 WHERE id = ?", [id]);
    res.json({ success: true, message: "Notifikasi ditandai telah dibaca" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui status notifikasi",
      error: err.message,
    });
  }
});

// ─── PUT /api/notifikasi/baca-semua/:nip ─── Tandai semua notifikasi milik pegawai sebagai dibaca
router.put("/baca-semua/:nip", async (req, res) => {
  try {
    const { nip } = req.params;
    await promiseDb.query("UPDATE notifikasi SET dibaca = 1 WHERE nip = ? AND dibaca = 0", [nip]);
    res.json({ success: true, message: "Seluruh notifikasi telah ditandai dibaca" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal menandai semua notifikasi",
      error: err.message,
    });
  }
});

module.exports = {
  router,
  buatNotifikasi,
};
