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

const GUEST_SIGNUP_HANDOFF_KEY = "davinto_guest_signup_handoff";
const GUEST_SIGNUP_HANDOFF_VERSION = 1;

const normalizeHandoffText = (value, maxLength) => {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
};

const sanitizeGuestSignupHandoff = (candidate) => {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    candidate.version !== GUEST_SIGNUP_HANDOFF_VERSION
  ) {
    return null;
  }

  const name = normalizeHandoffText(candidate.name, 100);
  const email = normalizeHandoffText(candidate.email, 254).toLowerCase();
  const phone = normalizeHandoffText(candidate.phone, 32);
  const preferredLocale =
    candidate.preferredLocale === "ar" ? "ar" : "en";

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return null;

  return {
    version: GUEST_SIGNUP_HANDOFF_VERSION,
    name,
    email,
    phone,
    preferredLocale,
  };
};

const readGuestSignupHandoff = (location) => {
  const navigationHandoff = sanitizeGuestSignupHandoff(
    location.state?.guestSignupHandoff
  );

  if (navigationHandoff) return navigationHandoff;

  const isOrderSuccessRefresh =
    new URLSearchParams(location.search).get("source") === "order-success";

  if (!isOrderSuccessRefresh) return null;

  try {
    const storedHandoff = sessionStorage.getItem(GUEST_SIGNUP_HANDOFF_KEY);
    return storedHandoff
      ? sanitizeGuestSignupHandoff(JSON.parse(storedHandoff))
      : null;
  } catch {
    return null;
  }
};

const clearGuestSignupHandoff = () => {
  try {
    sessionStorage.removeItem(GUEST_SIGNUP_HANDOFF_KEY);
  } catch {
    // The authenticated session is still valid if browser storage is blocked.
  }
};

const getIntendedDestination = (location) => {
  const from = location.state?.from;

  if (!from?.pathname || from.pathname.startsWith("/admin")) {
    return "/account";
  }

  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
};

const SignUp = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isCustomerAuthenticated, isCustomerLoading } =
    useCustomerAuth();

  const [guestSignupHandoff] = useState(() =>
    readGuestSignupHandoff(location)
  );
  const isOrderHandoff = Boolean(guestSignupHandoff);

  // SEO
  useSeo({
    title: t("signup.seoTitle"),
    description: t("signup.seoDescription"),
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState(() => ({
    name: guestSignupHandoff?.name || "",
    email: guestSignupHandoff?.email || "",
    phone: guestSignupHandoff?.phone || "",
    preferredLocale: guestSignupHandoff?.preferredLocale || "",
    password: "",
    confirmPassword: "",
  }));
  const [error, setError] = useState("");
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = isOrderHandoff
    ? "/account"
    : getIntendedDestination(location);

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
    if (emailAlreadyRegistered) setEmailAlreadyRegistered(false);
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

    if (!isOrderHandoff && formData.password !== formData.confirmPassword) {
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

    if (isOrderHandoff) {
      payload.preferredLocale = formData.preferredLocale;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setEmailAlreadyRegistered(false);

      await signup(payload);
      clearGuestSignupHandoff();
      navigate(destination, { replace: true });
    } catch (err) {
      const isServerError = Number(err?.response?.status || 0) >= 500;
      const isEmailConflict =
        Number(err?.response?.status || 0) === 409 &&
        /email/i.test(err?.response?.data?.message || err?.message || "");

      setEmailAlreadyRegistered(isEmailConflict);
      setError(
        (isEmailConflict && t("signup.emailAlreadyRegistered")) ||
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
          <Card className="order-2 mx-auto w-full max-w-xl border-[#c7a852]/30 bg-[#f5f0e8] p-7 text-[#1c1917] sm:p-10 lg:order-1">
            <p className="font-serif text-4xl font-semibold text-[#1c1917]">
              {t("signup.title")}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#8b8075]">
              {isOrderHandoff
                ? t("signup.orderSuccessDescription")
                : t("signup.description")}
            </p>

            {error && (
              <div
                className="mt-6 border border-[#b8585d]/45 bg-[#882c30]/10 px-4 py-3 text-sm font-semibold text-[#882c30]"
                role="alert"
              >
                <p>{error}</p>
                {emailAlreadyRegistered && (
                  <Link
                    to="/signin"
                    state={{ from: { pathname: "/account" } }}
                    className="mt-2 inline-block font-black underline decoration-2 underline-offset-4 transition hover:text-[#1c1917]"
                  >
                    {t("signup.emailAlreadyRegisteredSignIn")}
                  </Link>
                )}
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
                readOnly={isOrderHandoff}
              />

              <Input
                label={t("signup.email")}
                name="email"
                type="email"
                value={formData.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
                readOnly={isOrderHandoff}
              />

              <Input
                label={t("signup.phone")}
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={updateField}
                placeholder={t("signup.phonePlaceholder")}
                autoComplete="tel"
                readOnly={isOrderHandoff}
              />

              {isOrderHandoff && (
                <Input
                  label={t("signup.preferredLocale")}
                  name="preferredLocale"
                  value={t(
                    `signup.${
                      formData.preferredLocale === "ar"
                        ? "localeArabic"
                        : "localeEnglish"
                    }`
                  )}
                  readOnly
                />
              )}

              <div
                className={
                  isOrderHandoff ? "" : "grid gap-5 sm:grid-cols-2"
                }
              >
                <Input
                  label={t("signup.password")}
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={updateField}
                  placeholder={t("signup.passwordPlaceholder")}
                  autoComplete="new-password"
                />

                {!isOrderHandoff && (
                  <Input
                    label={t("signup.confirmPassword")}
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={updateField}
                    placeholder={t("signup.confirmPlaceholder")}
                    autoComplete="new-password"
                  />
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("signup.submitting") : t("signup.submit")}
              </Button>
            </form>

            <p className="mt-7 border-t border-[#8b8075]/25 pt-6 text-center text-sm text-[#8b8075]">
              {t("signup.existing")}{" "}
              <Link
                to="/signin"
                state={{ from: location.state?.from }}
                className="font-bold text-[#882c30] transition hover:text-[#1c1917]"
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
