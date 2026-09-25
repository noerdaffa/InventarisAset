import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api";
import { formatRupiah, formatTanggal, slugBadge } from "../../../utils/format";
import "./AsetList.css";

function AsetList({ userData }) {
  const [asets, setAsets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    kondisi: "",
    status_bmn: "",
    nama_satker: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    kondisi: [],
    status_bmn: [],
    nama_satker: [],
  });

  // Fetch data aset dari database
  const fetchAsets = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pagination.limit,
          search: searchTerm,
          ...filters,
        };
        const response = await api.get("/aset", { params });
        if (response.data.success) {
          setAsets(response.data.data);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        console.error("Error fetching asets:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, pagination.limit]
  );

  // Fetch opsi filter yang ada dari database
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get("/aset/opsi-filter");
      if (response.data.success) {
        setFilterOptions(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAsets(1);
  }, [fetchAsets]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      kondisi: "",
      status_bmn: "",
      nama_satker: "",
    });
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchAsets(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchAsets(pagination.page + 1);
    }
  };

  const isFiltered =
    searchTerm || filters.kondisi || filters.status_bmn || filters.nama_satker;

  const activeFilterCount = [
    filters.kondisi,
    filters.status_bmn,
    filters.nama_satker,
  ].filter(Boolean).length;

  return (
    <div className="aset-list-container">
      {/* Header & Metrik */}
      <div className="aset-list-header">
        <div className="aset-header-left">
          <div className="aset-badge-scope">Katalog Inventaris BMKG</div>
          <h2 className="aset-header-title">Daftar Data Aset BMN</h2>
          <p className="aset-list-subtitle">
            Pencarian dan pemantauan data barang milik negara di lingkungan BMKG secara transparan dan akurat.
          </p>
        </div>

        <div className="aset-metric-chip">
          <div className="metric-chip-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="metric-chip-meta">
            <span className="metric-chip-value">{pagination.total?.toLocaleString("id-ID") || 0}</span>
            <span className="metric-chip-label">Total Aset Terdaftar</span>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian dan Filter */}
      <div className="search-filter-section">
        <div className="search-box-wrapper">
          <span className="search-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nama aset, kode barang, NUP, merk, tipe, atau satker..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchTerm("")}
              title="Hapus kata kunci pencarian"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns-row">
          <div className="filter-select-wrapper">
            <select
              name="kondisi"
              value={filters.kondisi}
              onChange={handleFilterChange}
              className={`filter-select ${filters.kondisi ? "active" : ""}`}
            >
              <option value="">Semua Kondisi Fisik</option>
              {filterOptions.kondisi && filterOptions.kondisi.length > 0 ? (
                filterOptions.kondisi.map((k) => (
                  <option key={k} value={k}>
                    Kondisi: {k}
                  </option>
                ))
              ) : (
                <>
                  <option value="Baik">Kondisi: Baik</option>
                  <option value="Rusak Ringan">Kondisi: Rusak Ringan</option>
                  <option value="Rusak Berat">Kondisi: Rusak Berat</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              name="status_bmn"
              value={filters.status_bmn}
              onChange={handleFilterChange}
              className={`filter-select ${filters.status_bmn ? "active" : ""}`}
            >
              <option value="">Semua Status BMN</option>
              {filterOptions.status_bmn && filterOptions.status_bmn.length > 0 ? (
                filterOptions.status_bmn.map((s) => (
                  <option key={s} value={s}>
                    Status: {s}
                  </option>
                ))
              ) : (
                <>
                  <option value="Digunakan">Status: Digunakan</option>
                  <option value="Tidak Digunakan">Status: Tidak Digunakan</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-select-wrapper filter-satker-wrapper">
            <select
              name="nama_satker"
              value={filters.nama_satker}
              onChange={handleFilterChange}
              className={`filter-select ${filters.nama_satker ? "active" : ""}`}
            >
              <option value="">Seluruh Satuan Kerja (Satker)</option>
              {filterOptions.nama_satker &&
                filterOptions.nama_satker.map((sat) => (
                  <option key={sat} value={sat}>
                    Satker: {sat}
                  </option>
                ))}
            </select>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-reset-filter"
              title="Reset semua filter dan pencarian"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Reset Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Data / State Loading / Empty State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-title">Sinkronisasi data inventaris...</p>
          <span className="loading-sub">Mengambil catatan aset terkini dari server BMKG</span>
        </div>
      ) : asets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <h3 className="empty-state-title">Aset Tidak Ditemukan</h3>
          <p className="empty-state-desc">
            {isFiltered
              ? "Tidak ada data aset inventaris yang cocok dengan kriteria filter atau kata kunci pencarian Anda."
              : "Belum ada catatan aset yang tersedia dalam basis data inventaris."}
          </p>
          {isFiltered && (
            <button onClick={handleClearFilters} className="btn-reset-empty">
              Kembalikan ke Semua Aset
            </button>
          )}
        </div>
      ) : (
        <div className="aset-table-container">
          <div className="table-wrapper">
            <table className="aset-table">
              <thead>
                <tr>
                  <th style={{ width: 46, textAlign: "center" }}>No</th>
                  <th>Nama Barang &amp; Pengelola</th>
                  <th>Kodefikasi BMN</th>
                  <th>Merk &amp; Tipe</th>
                  <th>Satuan Kerja</th>
                  <th>Kondisi Fisik</th>
                  <th>Status Penggunaan</th>
                  <th>Tgl Perolehan</th>
                  <th style={{ textAlign: "right" }}>Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody>
                {asets.map((aset, idx) => (
                  <tr key={aset.id || idx}>
                    <td className="col-number">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>

                    <td className="col-nama-barang">
                      <div className="nama-barang-title">{aset.nama_barang || "Tanpa Nama Barang"}</div>
                      {aset.nama ? (
                        <div className="nama-pengelola">
                          <span className="pengelola-dot"></span>
                          <span>Pengelola: {aset.nama}</span>
                        </div>
                      ) : (
                        <div className="nama-pengelola-empty">Pengelola Umum / Bersama</div>
                      )}
                    </td>

                    <td className="col-kode">
                      <div className="kode-barang-cell">
                        <span className="kode-tag" title="Kode Barang">
                          {aset.kode_barang || "-"}
                        </span>
                        {aset.nup !== undefined && aset.nup !== null && (
                          <span className="nup-tag" title="Nomor Urut Pendaftaran">
                            NUP {aset.nup}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {aset.merk || aset.tipe ? (
                        <div className="merk-tipe-text">
                          <strong className="merk-strong">{aset.merk || "-"}</strong>
                          {aset.tipe && <span className="tipe-sub">{aset.tipe}</span>}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="col-satker">
                      {aset.nama_satker ? (
                        <div className="satker-cell" title={aset.nama_satker}>
                          <svg className="satker-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21h18"></path>
                            <path d="M9 8h1"></path>
                            <path d="M9 12h1"></path>
                            <path d="M9 16h1"></path>
                            <path d="M14 8h1"></path>
                            <path d="M14 12h1"></path>
                            <path d="M14 16h1"></path>
                            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                          </svg>
                          <span className="satker-name">{aset.nama_satker}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge-kondisi kondisi-${slugBadge(aset.kondisi)}`}>
                        <span className="badge-dot" aria-hidden="true"></span>
                        <span>{aset.kondisi || "Baik"}</span>
                      </span>
                    </td>

                    <td>
                      <span className={`badge-status status-${slugBadge(aset.status_bmn)}`}>
                        {aset.status_bmn || "Digunakan"}
                      </span>
                    </td>

                    <td className="col-tanggal">
                      {formatTanggal(aset.tanggal_perolehan)}
                    </td>

                    <td className="col-nilai text-right">
                      {formatRupiah(aset.nilai_perolehan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="pagination-wrapper">
            <div className="pagination-info">
              Menampilkan{" "}
              <strong>
                {Math.min(
                  (pagination.page - 1) * pagination.limit + 1,
                  pagination.total
                )}
              </strong>{" "}
              –{" "}
              <strong>
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}
              </strong>{" "}
              dari <strong>{pagination.total?.toLocaleString("id-ID")}</strong> total aset
            </div>

            <div className="pagination-controls">
              <button
                onClick={handlePrevPage}
                disabled={pagination.page <= 1}
                className="btn-pagination"
                aria-label="Halaman sebelumnya"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Sebelumnya</span>
              </button>

              <div className="pagination-page-indicator">
                <span className="page-current">{pagination.page}</span>
                <span className="page-slash">/</span>
                <span className="page-total">{pagination.totalPages}</span>
              </div>

              <button
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-pagination"
                aria-label="Halaman selanjutnya"
              >
                <span>Selanjutnya</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AsetList;
