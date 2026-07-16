import { useTranslation } from "react-i18next";

const FlagBadge = ({ language }) => {
  if (language === "ar") {
    return (
      <span
        className="relative h-3.5 w-5 shrink-0 overflow-hidden rounded-[1px] border border-[#f5f0e8]/25 shadow-[0_0_0.5rem_rgba(199,168,82,0.16)]"
        aria-hidden="true"
      >
        <span className="absolute inset-x-0 top-0 h-1/3 bg-[#ce2029]" />
        <span className="absolute inset-x-0 top-1/3 h-1/3 bg-[#f5f0e8]" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[#111111]" />
        <span className="absolute left-1/2 top-1/2 h-1 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[#c7a852]" />
      </span>
    );
  }

  return (
    <span
      className="relative h-3.5 w-5 shrink-0 overflow-hidden rounded-[1px] border border-[#f5f0e8]/25 shadow-[0_0_0.5rem_rgba(199,168,82,0.16)]"
      aria-hidden="true"
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, #b22234 0 7.7%, #f5f0e8 7.7% 15.4%)",
        }}
      />
      <span className="absolute left-0 top-0 h-[54%] w-[45%] bg-[#3c3b6e]" />
    </span>
  );
};

const LanguageSwitcher = ({ className = "", compact = false }) => {
  const { t, i18n } = useTranslation("common");
  const currentLanguage = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const nextLanguage = currentLanguage === "ar" ? "en" : "ar";
  const displayedLanguage = nextLanguage;

  const changeLanguage = async () => {
    await i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      type="button"
      onClick={changeLanguage}
      className={`davinto-press-gold inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#c7a852]/45 bg-[#1c1917]/94 px-3.5 text-[0.62rem] font-black tracking-[0.1em] text-[#f5f0e8] shadow-[0_0.75rem_2rem_rgba(28,25,23,0.3)] backdrop-blur transition duration-200 hover:border-[#c7a852] hover:bg-[#c7a852] hover:text-[#1c1917] focus-visible:outline-[#c7a852] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      aria-label={t("language.switchTo", {
        language: t(`language.${nextLanguage}`),
      })}
    >
      <FlagBadge language={displayedLanguage} />
      <span>
        {compact
          ? displayedLanguage === "en"
            ? "EN"
            : t("language.ar")
          : t(`language.${displayedLanguage}`)}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
