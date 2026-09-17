import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Product from "@/pages/Product";
import Selections from "@/pages/Selections";
import Connect from "@/pages/Connect";
import NotFound from "@/pages/NotFound";

// Admin System
import { AdminAuthProvider } from "@/lib/admin-auth";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminBulkUpload from "@/pages/admin/AdminBulkUpload";
import AdminMediaLibrary from "@/pages/admin/AdminMediaLibrary";

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Public Storefront Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/selections" element={<Selections />} />
          <Route path="/connect" element={<Connect />} />
        </Route>

        {/* Admin Authentication Route */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="bin" element={<AdminProducts defaultView="bin" />} />
            <Route path="archive" element={<AdminProducts defaultView="bin" />} />
            <Route path="media" element={<AdminMediaLibrary />} />
            <Route path="products/import" element={<AdminBulkUpload />} />
            <Route path="bulk-upload" element={<AdminBulkUpload />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="activity" element={<AdminAudit />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Fallback 404 */}
        <Route element={<Layout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster theme="dark" position="top-center" />
    </AdminAuthProvider>
  );
}
