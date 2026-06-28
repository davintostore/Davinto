import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import Select from "../../components/ui/Select";
import useSeo from "../../hooks/useSeo";
import { useCustomerAuth } from "../../context/customerAuthContext";
import { formatCustomerDate } from "../../utils/translatedLabels";

const Account = () => {
  const { t, i18n } = useTranslation(["account", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatDate = (value) =>
    value
      ? formatCustomerDate(value, language)
      : t("common:unavailable");
  const navigate = useNavigate();
  const { customer, updateProfile, signout } = useCustomerAuth();

  // SEO
  useSeo({
    title: t("account:seo.title"),
    description: t("account:seo.description"),
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState(() => ({
    name: customer?.name || "",
    phone: customer?.phone || "",
    preferredLocale: customer?.preferredLocale || "en",
  }));
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();

    if (name.length < 2) {
      setError(t("account:nameLength"));
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      await updateProfile({
        name,
        phone: formData.phone.trim() || null,
        preferredLocale: formData.preferredLocale,
      });

      setSuccessMessage(t("account:updateSuccess"));
    } catch (err) {
      setError(
        err?.friendlyMessage ||
          err?.message ||
          t("account:updateError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignout = async () => {
    try {
      setIsSigningOut(true);
      await signout();
    } catch {
      // CustomerAuthContext clears local customer state even when the backend
      // session has already expired.
    } finally {
      setIsSigningOut(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <>
      <PageHeader
        label={t("account:headerLabel")}
        title={t("account:hello", {
          name: customer?.name || t("account:customerFallback"),
        })}
        description={t("account:headerDescription")}
      />

      <section className="fashion-section">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
            <Card className="p-6 sm:p-9">
              <SectionLabel>{t("account:profileLabel")}</SectionLabel>
              <h2 className="font-serif text-3xl font-semibold">
                {t("account:profileTitle")}
              </h2>

              {error && (
                <div className="mt-6 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mt-6 border border-[#c7a852]/35 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#f5f0e8]">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label={t("account:name")}
                    name="name"
                    value={formData.name}
                    onChange={updateField}
                    autoComplete="name"
                  />

                  <Input
                    label={t("account:phone")}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={updateField}
                    placeholder="+20..."
                    autoComplete="tel"
                  />
                </div>

                <Input
                  label={t("account:email")}
                  value={customer?.email || ""}
                  disabled
                  readOnly
                />

                <Select
                  label={t("account:preferredLocale")}
                  name="preferredLocale"
                  value={formData.preferredLocale}
                  onChange={updateField}
                >
                  <option value="en">{t("account:english")}</option>
                  <option value="ar">{t("account:arabic")}</option>
                </Select>

                <div className="flex flex-col gap-3 border-t border-[#f5f0e8]/10 pt-6 sm:flex-row">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? t("account:saving") : t("account:save")}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSignout}
                    disabled={isSigningOut}
                  >
                    {isSigningOut
                      ? t("account:signingOut")
                      : t("account:signOut")}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="space-y-5 lg:sticky lg:top-32">
              <Card className="border-[#c7a852]/30 bg-[#110f0e]">
                <SectionLabel>{t("account:statusLabel")}</SectionLabel>

                <div className="divide-y divide-[#f5f0e8]/10 border-y border-[#f5f0e8]/10 text-sm">
                  <div className="flex justify-between gap-4 py-4">
                    <span className="text-[#f5f0e8]/45">
                      {t("account:status")}
                    </span>
                    <span className="font-bold capitalize text-[#c7a852]">
                      {t(`account:${customer?.status}`, {
                        defaultValue: customer?.status,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 py-4">
                    <span className="text-[#f5f0e8]/45">
                      {t("account:memberSince")}
                    </span>
                    <span className="text-right font-bold">
                      {formatDate(customer?.createdAt)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionLabel>{t("account:ordersLabel")}</SectionLabel>
                <h2 className="font-serif text-3xl font-semibold">
                  {t("account:ordersTitle")}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#f5f0e8]/50">
                  {t("account:ordersDescription")}
                </p>
                <Link to="/my-orders" className="mt-6 inline-block">
                  <Button>{t("account:openOrders")}</Button>
                </Link>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Account;
