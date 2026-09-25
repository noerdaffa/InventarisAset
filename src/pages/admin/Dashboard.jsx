import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function Dashboard() {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  const [data, setData] = useState({
    total_aset: 0,
    total_nilai_perolehan: 0,
    per_kondisi: [],
  });

  useEffect(() => {
    const adminData = localStorage.getItem("adminData");
    if(!adminData) {
      navigate("/admin/login");
      return;
    }
    setAdmin(JSON.parse(adminData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    navigate("/admin/login");
  };

  return (
    <div>
      <div className="d-grid-cards">
        <div className="d-card">
          <div className="d-card-label">Total Aset</div>
          <div className="d-card-value">{data.total_aset}</div>
          <div className="d-card-sub">Total nilai perolehan {formatRupiah(data.total_nilai_perolehan)}</div>
        </div>
      </div>

      <div className="d-panel">
        <div className="d-panel-title">Kondisi Aset</div>
        {data.per_kondisi.map((row) => (
          <div className="d-bar-row" key={row.kondisi}>
            <div className="d-bar-label">{row.kondisi}</div>
            <div className="d-bar-track">
              <div
                className="d-bar-fill"
                style={{ width: `${(row.jumlah / data.total_aset) * 100}%` }}
              />
            </div>
            <div className="d-bar-value">{row.jumlah}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
