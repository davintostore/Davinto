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
      <span
        className="relative h-3.5 w-5 shrink-0 overflow-hidden rounded-[1px] border border-[#f5f0e8]/25 shadow-[0_0_0.5rem_rgba(199,168,82,0.16)]"
        aria-hidden="true"
      >
        <span className="absolute inset-x-0 top-0 h-1/3 bg-[#ce2029]" />
        <span className="absolute inset-x-0 top-1/3 h-1/3 bg-[#f5f0e8]" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[#111111]" />
        <span className="absolute left-1/2 top-1/2 h-1 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[#c7a852]" />
      </span>
      <span>{compact ? t(`language.short.${nextLanguage}`) : t(`language.${nextLanguage}`)}</span>
    </button>
  );
};

export default LanguageSwitcher;
