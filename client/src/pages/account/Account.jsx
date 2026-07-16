import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Languages, LockKeyhole, LogOut, Mail, Package, Pencil, Phone, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import useSeo from "../../hooks/useSeo";
import { useCustomerAuth } from "../../context/customerAuthContext";

const FeedbackMessage = ({ message }) =>
  message.text ? (
    <div
      className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
        message.type === "success"
          ? "border-[#c7a852]/50 bg-[#c7a852]/12 text-[#1c1917]"
          : "border-[#882c30]/35 bg-[#882c30]/8 text-[#882c30]"
      }`}
      role="status"
    >
      {message.text}
    </div>
  ) : null;

const Account = () => {
  const { t, i18n } = useTranslation(["account", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const navigate = useNavigate();
  const { customer, updateProfile, changePassword, signout } = useCustomerAuth();
  const initialProfile = useMemo(
    () => ({
      name: customer?.name || "",
      phone: customer?.phone || "",
      preferredLocale: customer?.preferredLocale || "en",
    }),
    [customer]
  );
  const [formData, setFormData] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  useSeo({
    title: t("account:seo.title"),
    description: t("account:seo.description"),
    robots: "noindex,nofollow",
  });

  const initials =
    customer?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "D";

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setProfileMessage({ type: "", text: "" });
  };

  const cancelEdit = () => {
    setFormData(initialProfile);
    setProfileMessage({ type: "", text: "" });
    setIsEditing(false);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (name.length < 2) {
      setProfileMessage({ type: "error", text: t("account:nameLength") });
      return;
    }

    try {
      setIsSaving(true);
      setProfileMessage({ type: "", text: "" });
      await updateProfile({
        name,
        phone: formData.phone.trim() || null,
        preferredLocale: formData.preferredLocale,
      });
      setIsEditing(false);
      setProfileMessage({ type: "success", text: t("account:updateSuccess") });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text:
          language === "ar"
            ? t("account:updateError")
            : error?.friendlyMessage || error?.message || t("account:updateError"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePasswordField = (event) => {
    const { name, value } = event.target;
    setPasswordData((current) => ({ ...current, [name]: value }));
    setPasswordMessage({ type: "", text: "" });
  };

  const cancelPasswordChange = () => {
    setPasswordData({ currentPassword: "", newPassword: "", confirmation: "" });
    setPasswordMessage({ type: "", text: "" });
    setIsPasswordOpen(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: t("account:passwordLength") });
      return;
    }
    if (!/\p{L}/u.test(passwordData.newPassword) || !/\p{N}/u.test(passwordData.newPassword)) {
      setPasswordMessage({ type: "error", text: t("account:passwordStrength") });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmation) {
      setPasswordMessage({ type: "error", text: t("account:passwordMismatch") });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(passwordData);
      setPasswordData({ currentPassword: "", newPassword: "", confirmation: "" });
      setIsPasswordOpen(false);
      setPasswordMessage({ type: "success", text: t("account:passwordSuccess") });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text:
          language === "ar"
            ? t("account:passwordError")
            : error?.friendlyMessage || error?.message || t("account:passwordError"),
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignout = async () => {
    try {
      setIsSigningOut(true);
      await signout();
    } catch {
      // The auth provider still clears local state if the server session expired.
    } finally {
      setIsSigningOut(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <section className="bg-[#f5f0e8] py-12 text-[#1c1917] sm:py-20">
      <Container>
        <header className="mb-9">
          <h1 className="font-serif text-5xl leading-none sm:text-7xl">
            {t("account:profilePageTitle")}
          </h1>
          <p className="mt-4 text-base text-[#8b8075] sm:text-lg">
            {t("account:profilePageDescription")}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div className="space-y-6">
            <Card className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1c1917] font-serif text-2xl text-[#f5f0e8]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-3xl">{customer?.name}</h2>
                  <p className="mt-1 truncate text-sm text-[#8b8075]">{customer?.email}</p>
                </div>
              </div>
              {!isEditing && (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil size={15} className="me-2" />
                  {t("account:editProfile")}
                </Button>
              )}
            </Card>

            <Card>
              <div className="mb-6 flex items-center gap-3">
                <UserRound className="text-[#c7a852]" size={22} />
                <h2 className="font-serif text-3xl">{t("account:personalInformation")}</h2>
              </div>
              <FeedbackMessage message={profileMessage} />

              {isEditing ? (
                <form onSubmit={handleProfileSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Input label={t("account:name")} name="name" value={formData.name} onChange={updateField} autoComplete="name" />
                  <Input label={t("account:phone")} name="phone" type="tel" value={formData.phone} onChange={updateField} autoComplete="tel" />
                  <Input label={t("account:email")} value={customer?.email || ""} disabled readOnly />
                  <Select label={t("account:preferredLocale")} name="preferredLocale" value={formData.preferredLocale} onChange={updateField}>
                    <option value="en">{t("account:english")}</option>
                    <option value="ar">{t("account:arabic")}</option>
                  </Select>
                  <div className="flex gap-3 sm:col-span-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? t("account:saving") : t("account:save")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={cancelEdit} disabled={isSaving}>
                      {t("account:cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    [UserRound, t("account:name"), customer?.name],
                    [Phone, t("account:phone"), customer?.phone || t("common:unavailable")],
                    [Mail, t("account:email"), customer?.email],
                    [Languages, t("account:preferredLocale"), t(`account:${customer?.preferredLocale === "ar" ? "arabic" : "english"}`)],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="rounded-lg border border-[#8b8075]/25 bg-[#f5f0e8] p-4">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8b8075]"><Icon size={15} />{label}</dt>
                      <dd className="mt-2 break-words font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="text-[#c7a852]" size={22} />
                  <div>
                    <h2 className="font-serif text-3xl">{t("account:security")}</h2>
                    <p className="mt-1 text-sm tracking-[0.25em] text-[#8b8075]">••••••••••••</p>
                  </div>
                </div>
                {!isPasswordOpen && (
                  <Button variant="secondary" onClick={() => setIsPasswordOpen(true)}>
                    {t("account:changePassword")}
                  </Button>
                )}
              </div>
              <FeedbackMessage message={passwordMessage} />
              {isPasswordOpen && (
                <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-5">
                  <Input label={t("account:currentPassword")} name="currentPassword" type="password" value={passwordData.currentPassword} onChange={updatePasswordField} autoComplete="current-password" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label={t("account:newPassword")} name="newPassword" type="password" value={passwordData.newPassword} onChange={updatePasswordField} autoComplete="new-password" />
                    <Input label={t("account:confirmPassword")} name="confirmation" type="password" value={passwordData.confirmation} onChange={updatePasswordField} autoComplete="new-password" />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? t("account:changingPassword") : t("account:save")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={cancelPasswordChange} disabled={isChangingPassword}>
                      {t("account:cancel")}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-32">
            <Card>
              <Package className="text-[#c7a852]" size={24} />
              <h2 className="mt-4 font-serif text-3xl">{t("account:orders")}</h2>
              <p className="mt-3 text-sm leading-7 text-[#8b8075]">{t("account:viewTrackOrders")}</p>
              <Link to="/my-orders" className="mt-6 inline-block">
                <Button>{t("account:viewOrders")}</Button>
              </Link>
            </Card>

            <div className="rounded-xl border border-[#882c30]/25 bg-[#f5f0e8] p-6">
              <Button variant="danger" className="w-full" onClick={handleSignout} disabled={isSigningOut}>
                <LogOut size={16} className="me-2" />
                {isSigningOut ? t("account:signingOut") : t("account:signOut")}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Account;
