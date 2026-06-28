const LOGO_SRC = "/images/logo/davinto-spinning-logo.webp";
const LAYER_COUNT = 28;

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

const layers = Array.from({ length: LAYER_COUNT }, (_, index) => {
  const t = LAYER_COUNT === 1 ? 0.5 : index / (LAYER_COUNT - 1);
  const isFace = index === 0 || index === LAYER_COUNT - 1;
  const edge = 1 - Math.abs(t - 0.5) * 2;
  const brightness = isFace ? 1 : 0.92 - edge * 0.62;
  const saturation = isFace ? 1 : 1 - edge * 0.55;

  return {
    index,
    style: {
      transform: getLayerTransform(index),
      filter: `brightness(${brightness.toFixed(3)}) saturate(${saturation.toFixed(
        3
      )})`,
    },
  };
});

const SpinningDavintoLogo = () => {
  return (
    <div className="davinto-spin-logo" aria-hidden="true">
      <div className="davinto-spin-logo__stage">
        {layers.map((layer) => (
          <img
            key={layer.index}
            src={LOGO_SRC}
            alt=""
            className="davinto-spin-logo__layer"
            draggable="false"
            decoding="async"
            style={layer.style}
          />
        ))}
      </div>
    </div>
  );
};

export default SpinningDavintoLogo;
