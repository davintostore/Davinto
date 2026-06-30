import { useEffect, useState } from "react";

const LOGO_SRC = "/images/logo/davinto-spinning-logo.webp?v=4";
const LAYER_COUNT = 30;
let logoDecodePromise = null;
let isLogoDecoded = false;

const waitForImageLoad = (image) =>
  new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }

    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Davinto spinning logo failed to load"));
  });

const preloadSpinningLogo = () => {
  if (isLogoDecoded || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (logoDecodePromise) return logoDecodePromise;

  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  image.src = LOGO_SRC;

  logoDecodePromise = (image.decode
    ? image.decode().catch(() => waitForImageLoad(image))
    : waitForImageLoad(image)
  )
    .then(() => {
      isLogoDecoded = true;
    })
    .catch((error) => {
      logoDecodePromise = null;
      throw error;
    });

  return logoDecodePromise;
};

if (typeof window !== "undefined") {
  preloadSpinningLogo().catch(() => {});
}

const mixColor = (a, b, amount) => ({
  r: Math.round(a.r * (1 - amount) + b.r * amount),
  g: Math.round(a.g * (1 - amount) + b.g * amount),
  b: Math.round(a.b * (1 - amount) + b.b * amount),
});

const toRgb = (color) => `rgb(${color.r}, ${color.g}, ${color.b})`;

const getLayerTransform = (index) => {
  const offset = LAYER_COUNT === 1 ? 0 : index / (LAYER_COUNT - 1) - 0.5;

  if (offset < 0) {
    return `translateZ(clamp(${(offset * 1.1).toFixed(4)}rem, ${(
      offset * 1.25
    ).toFixed(4)}vw, ${(offset * 0.55).toFixed(4)}rem))`;
  }

  return `translateZ(clamp(${(offset * 0.55).toFixed(4)}rem, ${(
    offset * 1.25
  ).toFixed(4)}vw, ${(offset * 1.1).toFixed(4)}rem))`;
};

const glassDark = { r: 42, g: 47, b: 58 };
const glassLight = mixColor(glassDark, { r: 255, g: 255, b: 255 }, 0.74);

const layers = Array.from({ length: LAYER_COUNT }, (_, index) => {
  const t = LAYER_COUNT === 1 ? 0.5 : index / (LAYER_COUNT - 1);
  const edge = 1 - Math.abs(t - 0.5) * 2;
  const color = mixColor(glassLight, glassDark, edge);

  return {
    index,
    style: {
      transform: getLayerTransform(index),
      "--layer-bg": toRgb(color),
      "--layer-opacity": (0.55 + edge * 0.4).toFixed(3),
    },
  };
});

const SpinningDavintoLogo = () => {
  const [isReady, setIsReady] = useState(isLogoDecoded);

  useEffect(() => {
    if (isReady) return undefined;

    let isMounted = true;

    preloadSpinningLogo()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isReady]);

  return (
    <div
      className="davinto-spin-logo"
      aria-hidden="true"
      data-ready={isReady ? "true" : "false"}
      style={{ "--davinto-logo-mask": `url("${LOGO_SRC}")` }}
    >
      <div className="davinto-spin-logo__stage">
        {layers.map((layer) => (
          <div
            key={layer.index}
            className="davinto-spin-logo__mask-layer"
            style={layer.style}
          />
        ))}
        <div className="davinto-spin-logo__cap davinto-spin-logo__cap--back" />
        <div className="davinto-spin-logo__cap davinto-spin-logo__cap--front" />
        <div className="davinto-spin-logo__gloss" />
        <div className="davinto-spin-logo__highlight" />
      </div>
    </div>
  );
};

export default SpinningDavintoLogo;
