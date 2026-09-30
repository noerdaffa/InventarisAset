import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLayout from "./pages/admin/layout/AdminLayout";
import ImportData from "./pages/admin/ImportData";
import KelolaAset from "./pages/admin/KelolaAset";
import KelolaPeminjaman from "./pages/admin/KelolaPeminjaman";
import KelolaPengembalian from "./pages/admin/KelolaPengembalian";
import Monitoring from "./pages/admin/Monitoring";
import ExportPdf from "./pages/admin/ExportPdf";
import UserLogin from "./pages/user/Login";
import UserRegister from "./pages/user/Register";
import UserLayout from "./pages/user/Dashboard";
import AsetList from "./pages/user/components/AsetList";
import ProfileSettings from "./pages/user/components/ProfileSettings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/user/login" replace />} />

        {/* Admin Auth Route */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Feature Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="aset" element={<KelolaAset initialTab="aset" />} />
          <Route path="peminjaman" element={<KelolaPeminjaman />} />
          <Route path="pengembalian" element={<KelolaPengembalian />} />
          <Route path="import" element={<ImportData />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="export" element={<ExportPdf />} />

          {/* Backward compatibility for legacy /admin/dashboard/* paths */}
          <Route path="dashboard/aset" element={<Navigate to="/admin/aset" replace />} />
          <Route path="dashboard/peminjaman" element={<Navigate to="/admin/peminjaman" replace />} />
          <Route path="dashboard/pengembalian" element={<Navigate to="/admin/pengembalian" replace />} />
          <Route path="dashboard/import" element={<Navigate to="/admin/import" replace />} />
          <Route path="dashboard/monitoring" element={<Navigate to="/admin/monitoring" replace />} />
          <Route path="dashboard/export" element={<Navigate to="/admin/export" replace />} />
        </Route>

        {/* User Auth Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />

        {/* Redirect /dashboard atau /user/dashboard ke /user/aset */}
        <Route path="/dashboard" element={<Navigate to="/user/aset" replace />} />
        <Route path="/user/dashboard" element={<Navigate to="/user/aset" replace />} />
        <Route path="/user/dashboard/*" element={<Navigate to="/user/aset" replace />} />

        {/* User Feature Routes */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<Navigate to="/user/aset" replace />} />
          <Route path="aset" element={<AsetList initialTab="aset" />} />
          <Route path="peminjaman" element={<AsetList initialTab="peminjaman" />} />
          <Route path="pengembalian" element={<AsetList initialTab="pengembalian" />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="profil" element={<Navigate to="/user/profile" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
