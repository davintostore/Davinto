import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const LanguageDirectionProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return children;
};

export default LanguageDirectionProvider;
