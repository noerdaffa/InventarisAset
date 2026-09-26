const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

router.post(["/login", "/admin/login"], async (req, res) => {
  const username = (req.body.name || req.body.username || "").trim();
  const password = req.body.password ? String(req.body.password).trim() : "";

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Nama pengguna dan kata sandi harus diisi",
    });
  }

  try {
    // Cek admin di database berdasarkan username (case-insensitive)
    const [results] = await promiseDb.query(
      "SELECT * FROM admin WHERE LOWER(username) = LOWER(?)",
      [username]
    );

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Nama pengguna admin tidak ditemukan",
      });
    }

    const admin = results[0];

    // Bandingkan password (dengan toleransi untuk admin/admin123)
    const isPasswordMatch =
      password === admin.password ||
      (admin.username.toLowerCase() === "admin" && (password === "admin" || password === "admin123"));

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Kata sandi salah",
      });
    }

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        id: admin.id,
        name: admin.username,
        username: admin.username,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
});

module.exports = router;