import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLayout from "./pages/admin/layout/AdminLayout";
import ImportData from "./pages/admin/ImportData";
import KelolaAset from "./pages/admin/KelolaAset";
import KelolaPeminjaman from "./pages/admin/KelolaPeminjaman";
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

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="import" element={<ImportData />} />
          <Route path="aset" element={<KelolaAset />} />
          <Route path="peminjaman" element={<KelolaPeminjaman />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="export" element={<ExportPdf />} />
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
