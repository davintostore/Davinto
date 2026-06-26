import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import SectionLabel from "../../components/ui/SectionLabel";
import { useCustomerAuth } from "../../context/customerAuthContext";

const getIntendedDestination = (location) => {
  const from = location.state?.from;

  if (!from?.pathname || from.pathname.startsWith("/admin")) {
    return "/account";
  }

  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
};

const SignIn = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const location = useLocation();
  const { signin, isCustomerAuthenticated, isCustomerLoading } =
    useCustomerAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = getIntendedDestination(location);

  if (!isCustomerLoading && isCustomerAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      setError(t("signin.required"));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("signin.invalidEmail"));
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await signin({ email, password });
      navigate(destination, { replace: true });
    } catch (err) {
      const isServerError = Number(err?.response?.status || 0) >= 500;
      setError(
        (isServerError && t("signin.serverError")) ||
          err?.friendlyMessage ||
          err?.message ||
          t("signin.error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="fashion-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] bg-[#882c30] opacity-75 lg:block" />

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl">
            <SectionLabel>{t("signin.label")}</SectionLabel>
            <h1 className="editorial-heading text-7xl sm:text-9xl">
              {t("signin.hero")}
            </h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-[#f5f0e8]/58">
              {t("signin.heroDescription")}
            </p>
          </div>

          <Card className="mx-auto w-full max-w-lg border-[#c7a852]/30 bg-[#110f0e] p-7 sm:p-10">
            <p className="font-serif text-4xl font-semibold">
              {t("signin.title")}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/48">
              {t("signin.description")}
            </p>

            {error && (
              <div className="mt-6 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Input
                label={t("signin.email")}
                name="email"
                type="email"
                value={formData.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                label={t("signin.password")}
                name="password"
                type="password"
                value={formData.password}
                onChange={updateField}
                placeholder={t("signin.passwordPlaceholder")}
                autoComplete="current-password"
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("signin.submitting") : t("signin.submit")}
              </Button>
            </form>

            <p className="mt-7 border-t border-[#f5f0e8]/10 pt-6 text-center text-sm text-[#f5f0e8]/48">
              {t("signin.new")}{" "}
              <Link
                to="/signup"
                state={{ from: location.state?.from }}
                className="font-bold text-[#c7a852] transition hover:text-[#f5f0e8]"
              >
                {t("signin.create")}
              </Link>
            </p>
          </Card>
        </div>
      </Container>
    </section>
  );
};

export default SignIn;
