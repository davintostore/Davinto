import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";
import { useCustomerAuth } from "../../context/customerAuthContext";

const getIntendedDestination = (location) => {
  const from = location.state?.from;

  if (!from?.pathname || from.pathname.startsWith("/admin")) {
    return "/account";
  }

  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
};

const SignUp = () => {
  const { t, i18n } = useTranslation("auth");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isCustomerAuthenticated, isCustomerLoading } =
    useCustomerAuth();

  // SEO
  useSeo({
    title: language === "ar" 
      ? "إنشاء حساب | متجر دافينتو" 
      : "Create Account | Davinto Store",
    description: language === "ar"
      ? "أنشئ حسابًا جديدًا في متجر دافينتو لتتمكن من التسوق بسهولة."
      : "Create a new account at Davinto Store.",
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

  const validateForm = () => {
    if (!formData.name.trim()) return t("signup.nameRequired");
    if (formData.name.trim().length < 2) {
      return t("signup.nameLength");
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      return t("signup.invalidEmail");
    }

    if (formData.password.length < 8) {
      return t("signup.passwordLength");
    }

    if (formData.password !== formData.confirmPassword) {
      return t("signup.passwordMismatch");
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    if (formData.phone.trim()) {
      payload.phone = formData.phone.trim();
    }

    try {
      setIsSubmitting(true);
      setError("");

      await signup(payload);
      navigate(destination, { replace: true });
    } catch (err) {
      const isServerError = Number(err?.response?.status || 0) >= 500;
      setError(
        (isServerError && t("signup.serverError")) ||
          err?.friendlyMessage ||
          err?.message ||
          t("signup.error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="fashion-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[32%] bg-[#882c30] opacity-75 lg:block" />

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Card className="order-2 mx-auto w-full max-w-xl border-[#c7a852]/30 bg-[#110f0e] p-7 sm:p-10 lg:order-1">
            <p className="font-serif text-4xl font-semibold">
              {t("signup.title")}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/48">
              {t("signup.description")}
            </p>

            {error && (
              <div className="mt-6 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Input
                label={t("signup.name")}
                name="name"
                value={formData.name}
                onChange={updateField}
                placeholder={t("signup.namePlaceholder")}
                autoComplete="name"
              />

              <Input
                label={t("signup.email")}
                name="email"
                type="email"
                value={formData.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                label={t("signup.phone")}
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={updateField}
                placeholder={t("signup.phonePlaceholder")}
                autoComplete="tel"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label={t("signup.password")}
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={updateField}
                  placeholder={t("signup.passwordPlaceholder")}
                  autoComplete="new-password"
                />

                <Input
                  label={t("signup.confirmPassword")}
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={updateField}
                  placeholder={t("signup.confirmPlaceholder")}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("signup.submitting") : t("signup.submit")}
              </Button>
            </form>

            <p className="mt-7 border-t border-[#f5f0e8]/10 pt-6 text-center text-sm text-[#f5f0e8]/48">
              {t("signup.existing")}{" "}
              <Link
                to="/signin"
                state={{ from: location.state?.from }}
                className="font-bold text-[#c7a852] transition hover:text-[#f5f0e8]"
              >
                {t("signup.signin")}
              </Link>
            </p>
          </Card>

          <div className="order-1 max-w-xl lg:order-2 lg:pl-8">
            <SectionLabel>{t("signup.label")}</SectionLabel>
            <h1 className="editorial-heading text-7xl sm:text-9xl">
              {t("signup.hero")}
            </h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-[#f5f0e8]/58">
              {t("signup.heroDescription")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default SignUp;
