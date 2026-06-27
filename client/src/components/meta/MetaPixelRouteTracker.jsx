import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import {
  initMetaPixel,
  isPrivateMetaPixelPath,
  trackPageView,
} from "../../utils/metaPixel";

const MetaPixelRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (isPrivateMetaPixelPath(location.pathname)) return;

    initMetaPixel();
  }, [location.pathname]);

  useEffect(() => {
    // Admin, auth, checkout, account, cart, tracking, and order-result routes
    // can contain private customer/admin context, so Meta Pixel page views stay
    // limited to public browsing pages.
    if (isPrivateMetaPixelPath(location.pathname)) return;

    trackPageView();
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixelRouteTracker;
