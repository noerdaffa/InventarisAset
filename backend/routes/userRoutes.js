const express = require("express");
const router = express.Router();
const db = require("../db");
const promiseDb = db.promisePool;

router.get("/", async (req, res) => {
  try {
    const [rows] = await promiseDb.query("SELECT nip, nama, created_at FROM pegawai ORDER BY nama ASC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil data pegawai", error: err.message });
  }
});

router.post("/register", async (req, res) => {
  const { nip, nama, password } = req.body;

  if (!nip || !nama || !password) {
    return res.status(400).json({
      success: false,
      message: "NIP, nama, dan password harus diisi",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 6 karakter",
    });
  }

  try {
    const trimmedNip = nip.trim();
    const trimmedNama = nama.trim();

    const [existingUsers] = await promiseDb.query(
      "SELECT nip FROM pegawai WHERE nip = ?",
      [trimmedNip]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "NIP sudah terdaftar",
      });
    }

    await promiseDb.query(
      "INSERT INTO pegawai (nip, nama, password) VALUES (?, ?, ?)",
      [trimmedNip, trimmedNama, password]
    );

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      data: { nip: trimmedNip, nama: trimmedNama },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Registrasi gagal",
      error: err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  const { nip, password } = req.body;

  if (!nip || !password) {
    return res.status(400).json({
      success: false,
      message: "NIP dan password harus diisi",
    });
  }

  try {
    const [users] = await promiseDb.query(
      "SELECT nip, nama, password, created_at FROM pegawai WHERE nip = ?",
      [nip.trim()]
    );

    if (users.length === 0 || users[0].password !== password) {
      return res.status(401).json({
        success: false,
        message: "NIP atau password salah",
      });
    }

    const { password: ignoredPassword, ...userData } = users[0];
    res.json({ success: true, message: "Login berhasil", data: userData });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Login gagal",
      error: err.message,
    });
  }
});

// Update profile user (nama)
router.put("/:nip", async (req, res) => {
  const { nip } = req.params;
  const { nama } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({
      success: false,
      message: "Nama harus diisi",
    });
  }

  try {
    const [result] = await promiseDb.query(
      "UPDATE pegawai SET nama = ? WHERE nip = ?",
      [nama.trim(), nip]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: { nip, nama: nama.trim() },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui profil",
      error: err.message,
    });
  }
});

// Change password
router.put("/:nip/change-password", async (req, res) => {
  const { nip } = req.params;
  const { password_lama, password_baru } = req.body;

  if (!password_lama || !password_baru) {
    return res.status(400).json({
      success: false,
      message: "Password lama dan baru harus diisi",
    });
  }

  if (password_baru.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password baru minimal 6 karakter",
    });
  }

  try {
    const [users] = await promiseDb.query(
      "SELECT password FROM pegawai WHERE nip = ?",
      [nip]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    if (users[0].password !== password_lama) {
      return res.status(401).json({
        success: false,
        message: "Password lama tidak sesuai",
      });
    }

    await promiseDb.query(
      "UPDATE pegawai SET password = ? WHERE nip = ?",
      [password_baru, nip]
    );

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal mengubah password",
      error: err.message,
    });
  }
});

module.exports = router;
