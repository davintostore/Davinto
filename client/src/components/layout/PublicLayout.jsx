import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import Container from "../ui/Container";
import Button from "../ui/Button";
import CartDrawer from "../cart/CartDrawer";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { socialLinks } from "../../constants/socialLinks";
import { useAdminAuth } from "../../context/adminAuthContext";
import { useCart } from "../../context/cartContext";
import { useCustomerAuth } from "../../context/customerAuthContext";
import { getPublicSettingsRequest } from "../../services/settingsService";
import { getLocalizedSettings } from "../../utils/localizedContent";

const policyLinks = [
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Refund Policy", path: "/refund-policy" },
  { label: "Shipping Policy", path: "/shipping-policy" },
  { label: "Terms & Conditions", path: "/terms-and-conditions" },
];

const SocialIcon = ({ label }) => {
  const normalizedLabel = String(label || "").toLowerCase();

  if (normalizedLabel.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.4" cy="7.6" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (normalizedLabel.includes("tiktok")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M14.2 4.5v8.7a4 4 0 1 1-3.7-4v2.3a1.8 1.8 0 1 0 1.4 1.7V4.5h2.3Zm0 0c.4 2 1.7 3.3 3.8 3.8v2.3c-1.6-.1-2.8-.6-3.8-1.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M14 8.2h2.2V5h-2.6c-3 0-4.5 1.8-4.5 4.6v1.7H7v3.1h2.1V20h3.4v-5.6H15l.4-3.1h-2.9V9.7c0-1 .4-1.5 1.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

const PublicLayout = () => {
  const { t, i18n } = useTranslation("navigation");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const location = useLocation();
  const { cartCount, openCartDrawer } = useCart();
  const {
    isAuthenticated: isAdminAuthenticated,
    isCheckingAuth: isCheckingAdminAuth,
  } = useAdminAuth();
  const showAdminDashboardLink = !isCheckingAdminAuth && isAdminAuthenticated;
  const {
    customer,
    isCustomerAuthenticated,
    isCustomerLoading,
    signout,
  } = useCustomerAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const isFocusedRoute =
    location.pathname === "/cart" || location.pathname === "/checkout";
  const hideFooter = location.pathname === "/checkout";
  const showCustomerNav =
    !showAdminDashboardLink && !isCustomerLoading && isCustomerAuthenticated;
  const showGuestSignin =
    !showAdminDashboardLink && !isCustomerLoading && !isCustomerAuthenticated;
  const { data: settingsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettingsRequest,
  });
  const localizedSettings = getLocalizedSettings(
    settingsData?.settings,
    language
  );
  const storeAddress = localizedSettings?.store?.address || "";
  const announcementText = t("announcement");
  const navLinks = [
    { label: t("home"), path: "/" },
    { label: t("shop"), path: "/shop" },
    { label: t("trackOrder"), path: "/track-order" },
  ];

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsMenuOpen(false);
      setIsHeaderHidden(false);
      lastScrollYRef.current = window.scrollY || 0;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (isFocusedRoute) return undefined;

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY || 0, 0);
      const lastScrollY = lastScrollYRef.current;

      if (isMenuOpen || currentScrollY < 8) {
        setIsHeaderHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY;

      if (Math.abs(delta) < 8) return;

      setIsHeaderHidden(delta > 0 && currentScrollY > 96);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isFocusedRoute, isMenuOpen]);

  const handleCustomerSignout = async () => {
    setIsMenuOpen(false);

    try {
      await signout();
    } catch {
      // Local customer session is cleared by the auth context even if the
      // backend session has already expired.
    }
  };

  return (
    <div className="page-shell">
      {!isFocusedRoute && (
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-[#c7a852]/25 bg-[#050505] transition-transform duration-300 ease-out ${
          isHeaderHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="overflow-hidden bg-[#882c30]">
          <div className="relative h-7 overflow-hidden">
            <span
              className="davinto-announcement-track flex h-full w-max items-center gap-4 whitespace-nowrap px-8 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8]/85 sm:tracking-[0.22em]"
              dir="ltr"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a852]" />
              <span
                className="davinto-announcement-message"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {announcementText}
              </span>
            </span>
          </div>
        </div>

        <Container className="flex h-[4.75rem] items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center border border-[#f5f0e8]/15 text-[#f5f0e8] transition hover:border-[#c7a852] lg:hidden"
            aria-label={
              isMenuOpen ? t("closeNavigation") : t("openNavigation")
            }
            aria-expanded={isMenuOpen}
            aria-controls="public-mobile-navigation"
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <Link
            to="/"
            className="flex h-14 w-32 shrink-0 items-center justify-center sm:w-36"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Davinto"
          >
            <img
              src="/images/logo/logo-3.webp"
              alt="Davinto"
              className="max-h-12 w-full object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                className={({ isActive }) =>
                  `relative py-2 text-[0.66rem] font-black uppercase tracking-[0.24em] transition after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-[#c7a852] after:transition-transform ${
                    isActive
                      ? "text-[#f5f0e8] after:scale-x-100"
                      : "text-[#f5f0e8]/52 after:scale-x-0 hover:text-[#f5f0e8] hover:after:scale-x-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {showCustomerNav && (
              <>
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    `relative py-2 text-[0.66rem] font-black uppercase tracking-[0.24em] transition after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-[#c7a852] after:transition-transform ${
                      isActive
                        ? "text-[#f5f0e8] after:scale-x-100"
                        : "text-[#f5f0e8]/52 after:scale-x-0 hover:text-[#f5f0e8] hover:after:scale-x-100"
                    }`
                  }
                >
                  {t("account")}
                </NavLink>
                <NavLink
                  to="/my-orders"
                  className={({ isActive }) =>
                    `relative py-2 text-[0.66rem] font-black uppercase tracking-[0.24em] transition after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-[#c7a852] after:transition-transform ${
                      isActive
                        ? "text-[#f5f0e8] after:scale-x-100"
                        : "text-[#f5f0e8]/52 after:scale-x-0 hover:text-[#f5f0e8] hover:after:scale-x-100"
                    }`
                  }
                >
                  {t("myOrders")}
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {showGuestSignin && (
              <Link
                to="/signin"
                onClick={() => setIsMenuOpen(false)}
                className="hidden h-11 items-center gap-2 border border-[#f5f0e8]/15 px-4 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8] transition hover:border-[#c7a852] lg:flex"
              >
                <UserRound size={15} />
                {t("signIn")}
              </Link>
            )}

            <LanguageSwitcher className="hidden lg:inline-flex" compact />

            {showAdminDashboardLink && (
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="hidden h-11 items-center gap-2 border border-[#c7a852]/45 px-4 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#c7a852] transition hover:border-[#c7a852] hover:text-[#f5f0e8] lg:flex"
              >
                <LayoutDashboard size={15} />
                {t("dashboard")}
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                openCartDrawer();
              }}
              className="relative flex h-11 items-center gap-2 border border-[#f5f0e8]/15 px-3 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8] transition hover:border-[#c7a852] sm:px-4"
              aria-label={t("cartLabel", { count: cartCount })}
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">{t("cart")}</span>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-[#050505] bg-[#c7a852] px-1.5 text-[0.58rem] font-black leading-none tracking-normal text-[#1c1917]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {showCustomerNav && (
              <button
                type="button"
                onClick={handleCustomerSignout}
                className="hidden h-11 items-center gap-2 border border-[#f5f0e8]/15 px-4 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8]/65 transition hover:border-[#c7a852] hover:text-[#f5f0e8] lg:flex"
              >
                <LogOut size={15} />
                {t("signOut")}
              </button>
            )}

            <Link to="/checkout" className="hidden xl:block">
              <Button>{t("checkout")}</Button>
            </Link>
          </div>
        </Container>

        {isMenuOpen && (
          <div
            id="public-mobile-navigation"
            className="border-t border-[#f5f0e8]/10 bg-[#050505] lg:hidden"
          >
            <Container className="py-5">
              <nav className="grid">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === "/"}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between border-b border-[#f5f0e8]/10 py-4 text-sm font-black uppercase tracking-[0.2em] ${
                        isActive ? "text-[#c7a852]" : "text-[#f5f0e8]/72"
                      }`
                    }
                  >
                    <span>{link.label}</span>
                  </NavLink>
                ))}

                {showAdminDashboardLink && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between border-b border-[#f5f0e8]/10 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#c7a852]"
                  >
                    <span>{t("dashboard")}</span>
                    <LayoutDashboard size={16} />
                  </Link>
                )}

                {!showAdminDashboardLink &&
                  !isCustomerLoading &&
                  (isCustomerAuthenticated ? (
                    <>
                      <Link
                        to="/account"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between border-b border-[#f5f0e8]/10 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#c7a852]"
                      >
                        <span>{t("account")}</span>
                        <UserRound size={16} />
                      </Link>
                      <Link
                        to="/my-orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between border-b border-[#f5f0e8]/10 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#c7a852]"
                      >
                        <span>{t("myOrders")}</span>
                        <ShoppingBag size={16} />
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/signin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between border-b border-[#f5f0e8]/10 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#c7a852]"
                    >
                      <span>{t("signIn")}</span>
                      <UserRound size={16} />
                    </Link>
                  ))}
              </nav>

              <LanguageSwitcher className="mt-5 w-full" />

              {showCustomerNav && (
                <button
                  type="button"
                  onClick={handleCustomerSignout}
                  className="mt-5 flex w-full items-center justify-center gap-2 border border-[#f5f0e8]/15 px-5 py-3 text-[0.64rem] font-black uppercase tracking-[0.22em] text-[#f5f0e8]/70 transition hover:border-[#c7a852] hover:text-[#f5f0e8]"
                >
                  <LogOut size={15} />
                  {t("signOut")} {customer?.name ? `/ ${customer.name}` : ""}
                </button>
              )}

              <Link
                to="/checkout"
                className="mt-5 block"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button className="w-full">{t("checkout")}</Button>
              </Link>
            </Container>
          </div>
        )}

      </header>
      )}

      <div
        key={`route-progress-${location.pathname}`}
        className="davinto-route-progress"
        aria-hidden="true"
      />

      <main className={`min-h-screen ${isFocusedRoute ? "pt-0" : "pt-[6.5rem]"}`}>
        <div key={location.pathname} className="davinto-route-transition">
          <Outlet />
        </div>
      </main>

      <CartDrawer />

      {!hideFooter && (
      <footer className="border-t border-[#c7a852]/25 bg-[#110f0e]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <Link to="/" aria-label="Davinto home" className="mb-6 block w-fit">
                <img
                  src="/images/logo/logo-5.webp"
                  alt={t("footer.logoAlt")}
                  className="h-auto w-40 object-contain sm:w-48 lg:w-56"
                  loading="lazy"
                />
              </Link>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#f5f0e8]/58">
                {t("footer.statement")}
              </p>
            </div>

            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
                Policies
              </p>
              <div className="mt-5 grid gap-3 text-sm text-[#f5f0e8]/58">
                {policyLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="w-fit transition hover:text-[#f5f0e8]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
                {t("footer.social")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-[#f5f0e8]/58">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.ariaLabel}
                    className="flex h-10 w-10 items-center justify-center border border-[#f5f0e8]/12 transition hover:border-[#c7a852]/70 hover:text-[#c7a852]"
                  >
                    <SocialIcon label={link.label} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {showCustomerNav && (
            <button
              type="button"
              onClick={handleCustomerSignout}
              className="mt-8 hidden w-fit items-center gap-2 border-b border-[#f5f0e8]/20 pb-1 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#8b8075] transition hover:border-[#c7a852] hover:text-[#f5f0e8] lg:flex"
            >
              <LogOut size={13} />
              {t("signOutCustomer")}
            </button>
          )}

          <div className="mt-16 flex flex-col gap-3 border-t border-[#f5f0e8]/10 pt-6 text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#8b8075] sm:flex-row sm:items-center sm:justify-between">
            <p>{storeAddress || t("footer.location")}</p>
            <p>{t("footer.moment")}</p>
          </div>
        </Container>
      </footer>
      )}
    </div>
  );
};

export default PublicLayout;
