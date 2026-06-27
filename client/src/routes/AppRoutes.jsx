import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedAdminRoute from "../components/auth/ProtectedAdminRoute";
import ProtectedCustomerRoute from "../components/auth/ProtectedCustomerRoute";
import ScrollToTop from "../components/common/ScrollToTop";
import MetaPixelRouteTracker from "../components/meta/MetaPixelRouteTracker";

import AdminLayout from "../components/layout/AdminLayout";
import PublicLayout from "../components/layout/PublicLayout";

import Home from "../pages/public/Home";
import Shop from "../pages/public/Shop";
import Category from "../pages/public/Category";
import ProductDetails from "../pages/public/ProductDetails";
import Cart from "../pages/public/Cart";
import Checkout from "../pages/public/Checkout";
import OrderSuccess from "../pages/public/OrderSuccess";
import TrackOrder from "../pages/public/TrackOrder";
import {
  PrivacyPolicy,
  RefundPolicy,
  ShippingPolicy,
  TermsAndConditions,
} from "../pages/public/Policies";
import SignIn from "../pages/auth/SignIn";
import SignUp from "../pages/auth/SignUp";
import Account from "../pages/account/Account";
import MyOrders from "../pages/account/MyOrders";

import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminOffers from "../pages/admin/AdminOffers";
import AdminBundles from "../pages/admin/AdminBundles";
import AdminDiscountCodes from "../pages/admin/AdminDiscountCodes";
import AdminSettings from "../pages/admin/AdminSettings";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MetaPixelRouteTracker />

      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/account"
            element={
              <ProtectedCustomerRoute>
                <Account />
              </ProtectedCustomerRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedCustomerRoute>
                <MyOrders />
              </ProtectedCustomerRoute>
            }
          />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="bundles" element={<AdminBundles />} />
          <Route path="discount-codes" element={<AdminDiscountCodes />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
