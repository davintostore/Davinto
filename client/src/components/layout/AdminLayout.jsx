import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { Menu, X } from "lucide-react";

import { useAdminAuth } from "../../context/adminAuthContext";
import Button from "../ui/Button";

const adminLinks = [
  { label: "Overview", path: "/admin" },
  { label: "Products", path: "/admin/products" },
  { label: "Categories", path: "/admin/categories" },
  { label: "Orders", path: "/admin/orders" },
  { label: "Offers", path: "/admin/offers" },
  { label: "Bundles", path: "/admin/bundles" },
  { label: "Discount Codes", path: "/admin/discount-codes" },
  { label: "Settings", path: "/admin/settings" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      data-admin-shell
      dir="ltr"
      className="min-h-screen bg-[#1c1917] text-[#f5f0e8]"
    >
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#f5f0e8]/10 bg-[#110f0e] p-5 lg:flex lg:flex-col">
        <div className="mb-10">
          <p className="brand-wordmark text-3xl">
            Davinto
          </p>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8b8075]">
            Admin Dashboard
          </p>

          {admin && (
            <div className="mt-5 border border-[#f5f0e8]/10 bg-[#f5f0e8]/4 p-4">
              <p className="text-sm font-bold text-white">{admin.name}</p>
              <p className="mt-1 break-all text-xs text-white/40">
                {admin.email}
              </p>
              <p className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                {admin.role}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {adminLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/admin"}
              className={({ isActive }) =>
                `block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-[#882c30] text-[#f5f0e8]"
                    : "text-[#f5f0e8]/55 hover:bg-[#f5f0e8]/7 hover:text-[#f5f0e8]"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-[#f5f0e8]/10 pt-5">
          <Link
            to="/"
            className="block rounded-2xl border border-[#f5f0e8]/12 px-4 py-3 text-center text-sm font-bold text-[#f5f0e8]/65 transition hover:border-[#c7a852]/50 hover:text-[#f5f0e8]"
          >
            Go Home
          </Link>

          <Button variant="secondary" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-[#f5f0e8]/10 bg-[#1c1917]/96 px-5 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.24em]">
                Davinto Admin
              </p>
              {admin && (
                <p className="mt-1 truncate text-xs text-white/40">
                  {admin.email}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                className="flex h-10 items-center gap-2 rounded-full border border-[#c7a852]/40 px-4 text-xs font-black uppercase tracking-[0.16em] text-[#f5f0e8] transition hover:border-[#c7a852]"
                aria-expanded={isMobileMenuOpen}
                aria-controls="admin-mobile-navigation"
              >
                {isMobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
                <span>Menu</span>
              </button>

              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/65 sm:inline-flex"
              >
                Home
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/65"
              >
                Logout
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <nav
              id="admin-mobile-navigation"
              className="mt-4 grid rounded-2xl border border-[#f5f0e8]/10 bg-[#110f0e] px-2 py-2"
            >
              {adminLinks.map((link, index) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/admin"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-3 text-sm font-black uppercase tracking-[0.16em] transition ${
                      isActive
                        ? "bg-[#882c30] text-[#f5f0e8]"
                        : "text-[#f5f0e8]/58 hover:bg-[#f5f0e8]/7 hover:text-[#f5f0e8]"
                    }`
                  }
                >
                  <span>{link.label}</span>
                  <span className="text-[0.62rem] text-[#8b8075]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </NavLink>
              ))}

              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 flex items-center justify-between rounded-xl border border-[#f5f0e8]/10 px-3 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#c7a852]"
              >
                <span>Go Home</span>
                <span className="text-[0.62rem] text-[#8b8075]">Home</span>
              </Link>
            </nav>
          )}
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
