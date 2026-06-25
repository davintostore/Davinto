export const getOrderStatusLabel = (t, status) => {
  return t(`common:orderStatus.${status}`, {
    defaultValue: String(status || "").replaceAll("_", " "),
  });
};

export const getPaymentStatusLabel = (t, status) => {
  return t(`common:paymentStatus.${status}`, {
    defaultValue: String(status || "").replaceAll("_", " "),
  });
};

export const getPaymentMethodLabel = (t, method) => {
  return t(`common:paymentMethod.${method}`, {
    defaultValue: method || "",
  });
};

export const formatCurrency = (value, language = "en") => {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

export const formatCustomerDate = (
  value,
  language = "en",
  withTime = false
) => {
  if (!value) return "";

  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-EG", {
    year: "numeric",
    month: withTime ? "short" : "long",
    day: "numeric",
    ...(withTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {}),
  }).format(new Date(value));
};
