import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import AppRoutes from "./routes/AppRoutes";

const PRIVATE_ANALYTICS_PATHS = [
  "/admin",
  "/account",
  "/my-orders",
  "/checkout",
  "/track-order",
  "/order-success",
];

const getEventUrl = (url) => {
  try {
    return new URL(url, window.location.origin);
  } catch {
    return null;
  }
};

const shouldIgnoreAnalyticsUrl = (url) => {
  const eventUrl = getEventUrl(url);

  if (!eventUrl) {
    return false;
  }

  return PRIVATE_ANALYTICS_PATHS.some(
    (path) => eventUrl.pathname === path || eventUrl.pathname.startsWith(`${path}/`)
  );
};

const removeUrlDetails = (url) => {
  const eventUrl = getEventUrl(url);

  if (!eventUrl) {
    return url.split("?")[0].split("#")[0];
  }

  eventUrl.search = "";
  eventUrl.hash = "";

  return eventUrl.href;
};

const beforeVercelAnalyticsSend = (event) => {
  if (shouldIgnoreAnalyticsUrl(event.url)) {
    return null;
  }

  return {
    ...event,
    url: removeUrlDetails(event.url),
  };
};

const App = () => {
  return (
    <>
      <AppRoutes />
      <Analytics beforeSend={beforeVercelAnalyticsSend} />
      <SpeedInsights beforeSend={beforeVercelAnalyticsSend} />
    </>
  );
};

export default App;
