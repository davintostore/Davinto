import { useEffect, useRef, useState } from "react";
import Container from "./Container";
import SectionLabel from "./SectionLabel";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const prefersStaticHeaderVideo = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(window.navigator.connection?.saveData)
  );
};

const HeaderBackgroundVideo = ({ video }) => {
  const videoRef = useRef(null);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(() => {
    if (typeof window === "undefined") return true;
    return !prefersStaticHeaderVideo();
  });
  const [isVideoAvailable, setIsVideoAvailable] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = window.navigator.connection;

    const syncVideoState = () => {
      setShouldRenderVideo(!motionQuery.matches && !connection?.saveData);
      setIsVideoAvailable(true);
    };

    syncVideoState();
    motionQuery.addEventListener("change", syncVideoState);
    connection?.addEventListener?.("change", syncVideoState);

    return () => {
      motionQuery.removeEventListener("change", syncVideoState);
      connection?.removeEventListener?.("change", syncVideoState);
    };
  }, []);

  useEffect(() => {
    if (!shouldRenderVideo || !isVideoAvailable) return undefined;

    const currentVideo = videoRef.current;

    if (!currentVideo) return undefined;

    let isCancelled = false;

    currentVideo.muted = true;
    currentVideo.defaultMuted = true;
    currentVideo.playsInline = true;

    const playVideo = async () => {
      try {
        const playPromise = currentVideo.play();

        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }

        if (!isCancelled) {
          setIsVideoPlaying(true);
        }
      } catch {
        if (!isCancelled) {
          setIsVideoPlaying(false);
          setIsVideoAvailable(false);
        }
      }
    };

    playVideo();

    return () => {
      isCancelled = true;
    };
  }, [isVideoAvailable, shouldRenderVideo]);

  return (
    <>
      <div
        className="davinto-hero-poster absolute inset-0"
        style={{ backgroundImage: `url("${video.poster}")` }}
      />
      {shouldRenderVideo && isVideoAvailable && (
        <video
          ref={videoRef}
          className={`davinto-hero-video absolute inset-0 h-full w-full object-cover ${
            isVideoPlaying ? "davinto-hero-video--playing" : ""
          }`}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="metadata"
          poster={video.poster}
          aria-hidden="true"
          tabIndex={-1}
          onLoadStart={() => setIsVideoPlaying(false)}
          onPlaying={() => setIsVideoPlaying(true)}
          onError={() => setIsVideoAvailable(false)}
        >
          {video.webm && <source src={video.webm} type="video/webm" />}
          {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        </video>
      )}
    </>
  );
};

const PageHeader = ({
  label,
  title,
  description,
  children,
  className = "",
  backgroundImage = "",
  backgroundVideo = null,
  showMeta = null,
}) => {
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const shouldShowMeta = showMeta ?? isAdminPage;
  const backgroundClass =
    isAdminPage && !backgroundImage ? "bg-[#882c30]" : "bg-[#050505]";
  const backgroundMediaImage = backgroundVideo ? "" : backgroundImage;
  const hasBackgroundMedia = Boolean(backgroundVideo || backgroundMediaImage);
  const overlayStyle = hasBackgroundMedia
    ? {
        background:
          "linear-gradient(120deg, rgba(5,5,5,.86), rgba(5,5,5,.46) 58%, rgba(5,5,5,.18))",
      }
    : {
        background:
          "linear-gradient(120deg, rgba(17,15,14,.84), rgba(17,15,14,.34) 58%, transparent), radial-gradient(circle at 78% 18%, rgba(199,168,82,.12), transparent 24rem)",
      };

  return (
    <section
      className={`relative overflow-hidden border-b border-[#c7a852]/25 ${backgroundClass} pt-16 pb-10 sm:pt-20 sm:pb-14 ${className}`}
      style={
        backgroundMediaImage
          ? {
              backgroundColor: "#050505",
              backgroundImage: `url("${backgroundMediaImage}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {backgroundVideo && <HeaderBackgroundVideo video={backgroundVideo} />}

      {(isAdminPage || hasBackgroundMedia) && (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden="true"
          style={overlayStyle}
        />
      )}

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1fr_240px] lg:items-end">
          <div>
            {label && <SectionLabel>{label}</SectionLabel>}

            <div className="max-w-5xl">
              <h1 className="editorial-heading page-display-title text-[#f5f0e8]">
                {title}
              </h1>

              {description && (
                <p className="mt-7 max-w-2xl text-base leading-8 text-[#f5f0e8]/72 sm:text-lg">
                  {description}
                </p>
              )}

              {children && <div className="mt-8">{children}</div>}
            </div>
          </div>

          {shouldShowMeta && (
            <div className="hidden border-l border-[#f5f0e8]/25 pl-6 lg:block">
              <p className="brand-wordmark text-4xl text-[#c7a852]">D/01</p>
              <p className="mt-3 text-[0.65rem] font-black uppercase leading-5 tracking-[0.28em] text-[#f5f0e8]/55">
                {isAdminPage
                  ? "Davinto seasonal catalogue"
                  : t("seasonalCatalogue")}
              </p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
};

export default PageHeader;
