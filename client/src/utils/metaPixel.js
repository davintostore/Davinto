const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

const isBrowser = typeof window !== "undefined";

const isPixelEnabled = () => {
  return Boolean(isBrowser && PIXEL_ID);
};

const generateEventId = (eventName = "event") => {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `davinto-${eventName}-${random}`;
};

export const initMetaPixel = () => {
  if (!isPixelEnabled()) return false;

  if (window.fbq) return true;

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  window.fbq("init", PIXEL_ID);

  return true;
};

export const trackMetaEvent = (eventName, params = {}, options = {}) => {
  if (!isPixelEnabled()) return null;

  initMetaPixel();

  if (!window.fbq) return null;

  const eventId = options.eventId || generateEventId(eventName);

  window.fbq(
    "track",
    eventName,
    {
      ...params,
    },
    {
      eventID: eventId,
    }
  );

  return eventId;
};

export const trackPageView = () => {
  if (!isPixelEnabled()) return null;

  initMetaPixel();

  if (!window.fbq) return null;

  window.fbq("track", "PageView");

  return true;
};

export const trackViewContent = ({
  productId,
  name,
  category,
  price,
  currency = "EGP",
}) => {
  return trackMetaEvent("ViewContent", {
    content_ids: productId ? [String(productId)] : [],
    content_name: name || "",
    content_category: category || "",
    content_type: "product",
    value: Number(price || 0),
    currency,
  });
};

export const trackSearch = ({ searchString, resultsCount = 0 }) => {
  if (!searchString?.trim()) return null;

  return trackMetaEvent("Search", {
    search_string: searchString.trim(),
    content_category: "Products",
    results_count: Number(resultsCount || 0),
  });
};

export const trackAddToCart = ({
  productId,
  name,
  category,
  price,
  quantity = 1,
  currency = "EGP",
}) => {
  const safeQuantity = Number(quantity || 1);
  const safePrice = Number(price || 0);

  return trackMetaEvent("AddToCart", {
    content_ids: productId ? [String(productId)] : [],
    content_name: name || "",
    content_category: category || "",
    content_type: "product",
    value: safePrice * safeQuantity,
    currency,
    contents: productId
      ? [
          {
            id: String(productId),
            quantity: safeQuantity,
            item_price: safePrice,
          },
        ]
      : [],
  });
};

export const trackInitiateCheckout = ({
  items = [],
  value = 0,
  currency = "EGP",
}) => {
  return trackMetaEvent("InitiateCheckout", {
    content_ids: items.map((item) => String(item.productId || item.product)),
    content_type: "product",
    value: Number(value || 0),
    currency,
    num_items: items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    ),
    contents: items.map((item) => ({
      id: String(item.productId || item.product),
      quantity: Number(item.quantity || 1),
      item_price: Number(item.price || item.unitPrice || 0),
    })),
  });
};

export const trackAddPaymentInfo = ({
  paymentMethod,
  value = 0,
  currency = "EGP",
}) => {
  return trackMetaEvent("AddPaymentInfo", {
    payment_method: paymentMethod || "",
    value: Number(value || 0),
    currency,
  });
};

export const trackPurchase = ({
  orderId,
  orderNumber,
  items = [],
  value = 0,
  currency = "EGP",
}) => {
  return trackMetaEvent(
    "Purchase",
    {
      content_ids: items.map((item) => String(item.product || item.productId)),
      content_type: "product",
      value: Number(value || 0),
      currency,
      order_id: orderNumber || orderId || "",
      num_items: items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
      contents: items.map((item) => ({
        id: String(item.product || item.productId),
        quantity: Number(item.quantity || 1),
        item_price: Number(item.unitPrice || item.price || 0),
      })),
    },
    {
      eventId: orderNumber ? `davinto-purchase-${orderNumber}` : undefined,
    }
  );
};
