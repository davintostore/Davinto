import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import Container from "../ui/Container";
import Button from "../ui/Button";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { useCart } from "../../context/cartContext";
import { useCustomerAuth } from "../../context/customerAuthContext";
import { getPublicSettingsRequest } from "../../services/settingsService";
import { getLocalizedSettings } from "../../utils/localizedContent";

const PublicLayout = () => {
  const { t, i18n } = useTranslation("navigation");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const { cartCount } = useCart();
  const {
    customer,
    isCustomerAuthenticated,
    isCustomerLoading,
    signout,
  } = useCustomerAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: settingsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettingsRequest,
  });
  const localizedSettings = getLocalizedSettings(
    settingsData?.settings,
    language
  );
  const storeName = localizedSettings?.store?.name || "Davinto";
  const storeAddress = localizedSettings?.store?.address || "";
  const navLinks = [
    { label: t("home"), path: "/" },
    { label: t("shop"), path: "/shop" },
    { label: t("trackOrder"), path: "/track-order" },
  ];

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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#c7a852]/25 bg-[#1c1917]/96">
        <div className="border-b border-[#f5f0e8]/8 bg-[#882c30]">
          <Container className="flex min-h-7 items-center justify-center py-1.5 text-center">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.28em] text-[#f5f0e8]/85">
              {t("announcement")}
            </p>
          </Container>
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
            className="group text-center md:text-left"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="brand-wordmark text-[2rem] leading-none text-[#f5f0e8]">
              {storeName}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-px w-5 bg-[#c7a852] transition-all group-hover:w-9" />
              <span className="text-[0.5rem] font-black uppercase tracking-[0.28em] text-[#8b8075]">
                {t("clothingHouse")}
              </span>
            </div>
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

            {!isCustomerLoading && isCustomerAuthenticated && (
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
            {!isCustomerLoading && !isCustomerAuthenticated && (
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

            <Link
              to="/cart"
              onClick={() => setIsMenuOpen(false)}
              className="relative flex h-11 items-center gap-2 border border-[#f5f0e8]/15 px-3 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8] transition hover:border-[#c7a852] sm:px-4"
              aria-label={t("cartLabel", { count: cartCount })}
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">{t("cart")}</span>
              <span className="text-[#c7a852]">{String(cartCount).padStart(2, "0")}</span>
            </Link>

            {isCustomerAuthenticated && (
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
            className="border-t border-[#f5f0e8]/10 bg-[#1c1917] lg:hidden"
          >
            <Container className="py-5">
              <nav className="grid">
                {navLinks.map((link, index) => (
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
                    <span className="font-normal text-[#8b8075]">
                      0{index + 1}
                    </span>
                  </NavLink>
                ))}

                {!isCustomerLoading &&
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

              {isCustomerAuthenticated && (
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

      <main className="min-h-screen pt-[6.5rem]">
        <Outlet />
      </main>

      <footer className="border-t border-[#c7a852]/25 bg-[#110f0e]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <p className="brand-wordmark text-6xl text-[#f5f0e8] sm:text-7xl">
                {storeName}
              </p>
              <p className="mt-6 max-w-lg font-serif text-2xl leading-snug text-[#f5f0e8]/72">
                {t("footer.statement")}
              </p>
            </div>

            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
                {t("footer.navigate")}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-[#f5f0e8]/58">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="w-fit transition hover:text-[#f5f0e8]"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/cart"
                  className="w-fit transition hover:text-[#f5f0e8]"
                >
                  {t("cart")}
                </Link>
                {isCustomerAuthenticated && (
                  <>
                    <Link
                      to="/account"
                      className="w-fit transition hover:text-[#f5f0e8]"
                    >
                      {t("account")}
                    </Link>
                    <Link
                      to="/my-orders"
                      className="w-fit transition hover:text-[#f5f0e8]"
                    >
                      {t("myOrders")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
                {t("footer.nextPiece")}
              </p>
              <p className="mt-5 text-sm leading-7 text-[#f5f0e8]/52">
                {t("footer.description")}
              </p>
              <Link to="/shop" className="mt-6 inline-block">
                <Button variant="secondary">{t("footer.enterShop")}</Button>
              </Link>
            </div>
          </div>

          {isCustomerAuthenticated && (
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
    </div>
  );
};

export default PublicLayout;
