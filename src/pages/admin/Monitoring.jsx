import React, { useEffect, useState } from "react";
import api from "../../api";
import "./admin.css";

function Monitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/monitoring/summary")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Gagal memuat data monitoring"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Memuat data monitoring...</p>;
  if (error) return <div className="d-alert d-alert-error">{error}</div>;

  return (
    <div>
      <div className="d-grid-cards">
        <div className="d-card">
          <div className="d-card-label">Total Aset</div>
          <div className="d-card-value">{data.total_aset}</div>
        </div>
      </div>

      <div className="d-panel">
        <div className="d-panel-title">Distribusi Kondisi Aset</div>
        {data.per_kondisi.map((row) => (
          <div className="d-bar-row" key={row.kondisi}>
            <div className="d-bar-label">{row.kondisi}</div>
            <div className="d-bar-track">
              <div className="d-bar-fill" style={{ width: `${(row.jumlah / data.total_aset) * 100}%` }} />
            </div>
            <div className="d-bar-value">{row.jumlah}</div>
          </div>
        ))}
      </div>

      <div className="d-panel">
        <div className="d-panel-title">Distribusi Status BMN</div>
        {data.per_status_bmn.map((row) => (
          <div className="d-bar-row" key={row.status_bmn}>
            <div className="d-bar-label">{row.status_bmn}</div>
            <div className="d-bar-track">
              <div className="d-bar-fill" style={{ width: `${(row.jumlah / data.total_aset) * 100}%` }} />
            </div>
            <div className="d-bar-value">{row.jumlah}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Monitoring;
