const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/login", (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({
      success: false,
      message: "Nama dan password harus diisi",
    });
  }

  // Cek admin di database
  db.query("SELECT * FROM admin WHERE name = ?", [name], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
        error: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Nama admin tidak ditemukan",
      });
    }

    const admin = results[0];

    // Bandingkan password plain text
    if (password !== admin.password) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
      });
    }

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        id: admin.id,
        name: admin.name,
      },
    });
  });
});

module.exports = router;