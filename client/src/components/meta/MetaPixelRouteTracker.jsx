import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { initMetaPixel, trackPageView } from "../../utils/metaPixel";

const MetaPixelRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    initMetaPixel();
  }, []);

  useEffect(() => {
    trackPageView();
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixelRouteTracker;