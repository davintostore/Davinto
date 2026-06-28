import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ProtectedAdminRoute from "../components/auth/ProtectedAdminRoute";
import ProtectedCustomerRoute from "../components/auth/ProtectedCustomerRoute";
import ScrollToTop from "../components/common/ScrollToTop";
import MetaPixelRouteTracker from "../components/meta/MetaPixelRouteTracker";

import PublicLayout from "../components/layout/PublicLayout";

import Home from "../pages/public/Home";
import Shop from "../pages/public/Shop";
import ProductDetails from "../pages/public/ProductDetails";

const Category = lazy(() => import("../pages/public/Category"));
const Cart = lazy(() => import("../pages/public/Cart"));
const Checkout = lazy(() => import("../pages/public/Checkout"));
const OrderSuccess = lazy(() => import("../pages/public/OrderSuccess"));
const TrackOrder = lazy(() => import("../pages/public/TrackOrder"));
const SignIn = lazy(() => import("../pages/auth/SignIn"));
const SignUp = lazy(() => import("../pages/auth/SignUp"));
const Account = lazy(() => import("../pages/account/Account"));
const MyOrders = lazy(() => import("../pages/account/MyOrders"));
const AdminLayout = lazy(() => import("../components/layout/AdminLayout"));
const AdminLogin = lazy(() => import("../pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("../pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders"));
const AdminOffers = lazy(() => import("../pages/admin/AdminOffers"));
const AdminBundles = lazy(() => import("../pages/admin/AdminBundles"));
const AdminDiscountCodes = lazy(
  () => import("../pages/admin/AdminDiscountCodes")
);
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings"));
const PrivacyPolicy = lazy(() =>
  import("../pages/public/Policies").then((module) => ({
    default: module.PrivacyPolicy,
  }))
);
const RefundPolicy = lazy(() =>
  import("../pages/public/Policies").then((module) => ({
    default: module.RefundPolicy,
  }))
);
const ShippingPolicy = lazy(() =>
  import("../pages/public/Policies").then((module) => ({
    default: module.ShippingPolicy,
  }))
);
const TermsAndConditions = lazy(() =>
  import("../pages/public/Policies").then((module) => ({
    default: module.TermsAndConditions,
  }))
);

const RouteLoadingFallback = () => {
  const { t } = useTranslation("common");

  return (
    <section
      className="flex min-h-[42vh] items-center justify-center bg-[#050505] px-5 py-16 text-center text-[#f5f0e8]"
      role="status"
      aria-live="polite"
    >
      <div>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
          {t("brand")}
        </p>
        <p className="mt-4 font-serif text-4xl font-semibold">
          {t("loading")}
        </p>
      </div>
    </section>
  );
};

const withRouteFallback = (element) => (
  <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MetaPixelRouteTracker />

      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/category/:slug" element={withRouteFallback(<Category />)} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={withRouteFallback(<Cart />)} />
          <Route path="/checkout" element={withRouteFallback(<Checkout />)} />
          <Route
            path="/order-success"
            element={withRouteFallback(<OrderSuccess />)}
          />
          <Route path="/track-order" element={withRouteFallback(<TrackOrder />)} />
          <Route
            path="/privacy-policy"
            element={withRouteFallback(<PrivacyPolicy />)}
          />
          <Route
            path="/refund-policy"
            element={withRouteFallback(<RefundPolicy />)}
          />
          <Route
            path="/shipping-policy"
            element={withRouteFallback(<ShippingPolicy />)}
          />
          <Route
            path="/terms-and-conditions"
            element={withRouteFallback(<TermsAndConditions />)}
          />
          <Route path="/signin" element={withRouteFallback(<SignIn />)} />
          <Route path="/signup" element={withRouteFallback(<SignUp />)} />
          <Route
            path="/account"
            element={
              <ProtectedCustomerRoute>
                {withRouteFallback(<Account />)}
              </ProtectedCustomerRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedCustomerRoute>
                {withRouteFallback(<MyOrders />)}
              </ProtectedCustomerRoute>
            }
          />
        </Route>

        <Route path="/admin/login" element={withRouteFallback(<AdminLogin />)} />

        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              {withRouteFallback(<AdminLayout />)}
            </ProtectedAdminRoute>
          }
        >
          <Route index element={withRouteFallback(<AdminDashboard />)} />
          <Route path="products" element={withRouteFallback(<AdminProducts />)} />
          <Route
            path="categories"
            element={withRouteFallback(<AdminCategories />)}
          />
          <Route path="orders" element={withRouteFallback(<AdminOrders />)} />
          <Route path="offers" element={withRouteFallback(<AdminOffers />)} />
          <Route path="bundles" element={withRouteFallback(<AdminBundles />)} />
          <Route
            path="discount-codes"
            element={withRouteFallback(<AdminDiscountCodes />)}
          />
          <Route path="settings" element={withRouteFallback(<AdminSettings />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
