import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = ({ className = "", compact = false }) => {
  const { t, i18n } = useTranslation("common");
  const currentLanguage = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const nextLanguage = currentLanguage === "ar" ? "en" : "ar";

  const changeLanguage = async () => {
    await i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      type="button"
      onClick={changeLanguage}
      className={`inline-flex min-h-11 items-center justify-center gap-2 border border-[#f5f0e8]/15 px-3 text-[0.62rem] font-black tracking-[0.12em] text-[#f5f0e8] transition hover:border-[#c7a852] ${className}`}
      aria-label={t("language.switchTo", {
        language: t(`language.${nextLanguage}`),
      })}
    >
      <Languages size={15} aria-hidden="true" />
      <span>{compact ? t(`language.short.${nextLanguage}`) : t(`language.${nextLanguage}`)}</span>
    </button>
  );
};

export default LanguageSwitcher;
