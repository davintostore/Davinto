import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import useSeo from "../../hooks/useSeo";
import { useAdminAuth } from "../../context/adminAuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, isCheckingAuth } = useAdminAuth();

  // SEO
  useSeo({
    title: "Admin Login | Davinto Store",
    description: "Admin login for Davinto Store.",
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    document.title = "Admin Login | Davinto";
  }, []);

  if (!isCheckingAuth && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await login({ email, password });

      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.friendlyMessage || err?.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-admin-shell
      dir="ltr"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1c1917] px-5 text-[#f5f0e8]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(136,44,48,0.42),transparent_46%),repeating-linear-gradient(90deg,transparent_0,transparent_79px,rgba(245,240,232,0.025)_80px)]" />

      <Card className="relative z-10 w-full max-w-md">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#c7a852]">
          Davinto Admin
        </p>

        <h1 className="editorial-heading text-6xl">Login</h1>

        <p className="mt-4 text-sm leading-7 text-[#f5f0e8]/50">
          Access the dashboard to manage products, orders, offers, bundles,
          discount codes, and store settings.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={updateField}
            placeholder="enter your email"
            autoComplete="email"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={updateField}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging In..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
