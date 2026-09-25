const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

// GET /api/monitoring/summary -> ringkasan statistik untuk dashboard & monitoring
router.get("/summary", async (req, res) => {
  try {
    const [[totalAset]] = await promiseDb.query("SELECT COUNT(*) AS total FROM aset");
    const [[totalNilai]] = await promiseDb.query(
      "SELECT COALESCE(SUM(nilai_perolehan),0) AS total FROM aset"
    );
    const [perKondisi] = await promiseDb.query(
      `SELECT COALESCE(kondisi,'Belum diisi') AS kondisi, COUNT(*) AS jumlah
       FROM aset GROUP BY kondisi ORDER BY jumlah DESC`
    );
    const [perStatusBmn] = await promiseDb.query(
      `SELECT COALESCE(status_bmn,'Belum diisi') AS status_bmn, COUNT(*) AS jumlah
       FROM aset GROUP BY status_bmn ORDER BY jumlah DESC`
    );
    const [perSatker] = await promiseDb.query(
      `SELECT COALESCE(nama_satker,'Belum diisi') AS nama_satker, COUNT(*) AS jumlah
       FROM aset GROUP BY nama_satker ORDER BY jumlah DESC`
    );

    res.json({
      success: true,
      data: {
        total_aset: totalAset.total,
        total_nilai_perolehan: totalNilai.total,
        per_kondisi: perKondisi,
        per_status_bmn: perStatusBmn,
        per_satker: perSatker,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data monitoring", error: err.message });
  }
});

module.exports = router;
