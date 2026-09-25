const express = require("express");
const cors = require("cors");
const db = require("./db");
const adminRoutes = require("./routes/adminRoutes");
const asetRoutes = require("./routes/asetRoutes");
const importRoutes = require("./routes/importRoutes");
const monitoringRoutes = require("./routes/monitoringRoutes");
const exportRoutes = require("./routes/exportRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", adminRoutes);
app.use("/api/aset", asetRoutes);
app.use("/api/import", importRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend Berfungsi");
});

app.get("/api/test-db", (req, res) => {
  db.query("SELECT 1 AS test", (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Database gagal terhubung",
        error: err.message,
      });
    }

    res.json({
      message: "Database berhasil terhubung",
      data: result,
    });
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});