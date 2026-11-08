const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

// GET /api/monitoring/summary -> ringkasan statistik untuk dashboard & monitoring
router.get("/summary", async (req, res) => {
  try {
    let totalAsetVal = 0;
    let totalNilaiVal = 0;
    let perKondisi = [];
    let perStatusBmn = [];
    let perSatker = [];

    // 1. Total Aset
    try {
      const [asetRows] = await promiseDb.query("SELECT COUNT(*) AS total FROM aset");
      totalAsetVal = Number(asetRows?.[0]?.total) || 0;
    } catch (e) {
      console.warn("Query totalAset warning:", e.message);
    }

    // 2. Total Nilai Perolehan
    try {
      const [nilaiRows] = await promiseDb.query(
        "SELECT COALESCE(SUM(nilai_perolehan), 0) AS total FROM aset"
      );
      totalNilaiVal = Number(nilaiRows?.[0]?.total) || 0;
    } catch (e) {
      console.warn("Query totalNilai warning:", e.message);
    }

    // 3. Distribusi per Kondisi
    try {
      const [kondisiRows] = await promiseDb.query(
        `SELECT COALESCE(kondisi, 'Belum diisi') AS kondisi, COUNT(*) AS jumlah
         FROM aset GROUP BY kondisi ORDER BY jumlah DESC`
      );
      perKondisi = Array.isArray(kondisiRows) ? kondisiRows : [];
    } catch (e) {
      console.warn("Query perKondisi warning:", e.message);
    }

    // 4. Distribusi per Status BMN
    try {
      const [statusRows] = await promiseDb.query(
        `SELECT COALESCE(status_bmn, 'Belum diisi') AS status_bmn, COUNT(*) AS jumlah
         FROM aset GROUP BY status_bmn ORDER BY jumlah DESC`
      );
      perStatusBmn = Array.isArray(statusRows) ? statusRows : [];
    } catch (e) {
      console.warn("Query perStatusBmn warning:", e.message);
    }

    // 5. Distribusi per Satker
    try {
      const [satkerRows] = await promiseDb.query(
        `SELECT COALESCE(nama_satker, 'Belum diisi') AS nama_satker, COUNT(*) AS jumlah
         FROM aset GROUP BY nama_satker ORDER BY jumlah DESC`
      );
      perSatker = Array.isArray(satkerRows) ? satkerRows : [];
    } catch (e) {
      console.warn("Query perSatker warning:", e.message);
    }

    res.json({
      success: true,
      data: {
        total_aset: totalAsetVal,
        total_nilai_perolehan: totalNilaiVal,
        per_kondisi: perKondisi,
        per_status_bmn: perStatusBmn,
        per_satker: perSatker,
      },
    });
  } catch (err) {
    console.error("Gagal mengambil data monitoring:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data monitoring",
      error: err.message,
    });
  }
});

module.exports = router;
