import { Navigate, Route, Routes } from "react-router-dom";
import { StoreLayout } from "./components/store/Layout";
import { HomePage } from "./pages/store/Home";
import { CatalogPage } from "./pages/store/Catalog";
import { CategoryPage } from "./pages/store/Category";
import { ProductPage } from "./pages/store/Product";
import { CartPage } from "./pages/store/Cart";
import { CheckoutPage } from "./pages/store/Checkout";
import { OrderPage } from "./pages/store/Order";
import { AdminLogin } from "./pages/admin/Login";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminProducts } from "./pages/admin/Products";
import { AdminProductForm } from "./pages/admin/ProductForm";
import { AdminCategories } from "./pages/admin/Categories";
import { AdminBanners } from "./pages/admin/Banners";
import { AdminOrders } from "./pages/admin/Orders";
import { AdminOrderDetail } from "./pages/admin/OrderDetail";
import { AdminCustomers } from "./pages/admin/Customers";
import { AdminCoupons } from "./pages/admin/Coupons";
import { AdminSettings } from "./pages/admin/Settings";
import { AdminUsers } from "./pages/admin/Admins";

export function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/promocoes" element={<CatalogPage sale />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pedido/:number" element={<OrderPage />} />
        <Route path="/pedido/:number/sucesso" element={<OrderPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id" element={<AdminProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="admins" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
