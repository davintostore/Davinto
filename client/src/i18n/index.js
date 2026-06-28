import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enNavigation from "../locales/en/navigation.json";
import enHome from "../locales/en/home.json";
import enCatalog from "../locales/en/catalog.json";
import enCart from "../locales/en/cart.json";
import enCheckout from "../locales/en/checkout.json";
import enOrders from "../locales/en/orders.json";
import enAuth from "../locales/en/auth.json";
import enAccount from "../locales/en/account.json";
import enPolicies from "../locales/en/policies.json";

import arCommon from "../locales/ar/common.json";
import arNavigation from "../locales/ar/navigation.json";
import arHome from "../locales/ar/home.json";
import arCatalog from "../locales/ar/catalog.json";
import arCart from "../locales/ar/cart.json";
import arCheckout from "../locales/ar/checkout.json";
import arOrders from "../locales/ar/orders.json";
import arAuth from "../locales/ar/auth.json";
import arAccount from "../locales/ar/account.json";
import arPolicies from "../locales/ar/policies.json";

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    home: enHome,
    catalog: enCatalog,
    cart: enCart,
    checkout: enCheckout,
    orders: enOrders,
    auth: enAuth,
    account: enAccount,
    policies: enPolicies,
  },
  ar: {
    common: arCommon,
    navigation: arNavigation,
    home: arHome,
    catalog: arCatalog,
    cart: arCart,
    checkout: arCheckout,
    orders: arOrders,
    auth: arAuth,
    account: arAccount,
    policies: arPolicies,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["en", "ar"],
    fallbackLng: "en",
    defaultNS: "common",
    ns: Object.keys(resources.en),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "davinto_language",
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
