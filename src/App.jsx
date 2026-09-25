import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLayout from "./pages/admin/layout/AdminLayout";
import ImportData from "./pages/admin/ImportData";
import KelolaAset from "./pages/admin/KelolaAset";
import Monitoring from "./pages/admin/Monitoring";
import ExportPdf from "./pages/admin/ExportPdf";
import UserLogin from "./pages/user/Login";
import UserRegister from "./pages/user/Register";
import UserDashboard from "./pages/user/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/user/login" replace />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="import" element={<ImportData />} />
          <Route path="aset" element={<KelolaAset />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="export" element={<ExportPdf />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
