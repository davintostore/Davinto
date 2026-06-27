import Container from "./Container";
import SectionLabel from "./SectionLabel";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const PageHeader = ({
  label,
  title,
  description,
  children,
  className = "",
  backgroundImage = "",
  showMeta = null,
}) => {
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const shouldShowMeta = showMeta ?? isAdminPage;

  return (
    <section
      className={`relative overflow-hidden border-b border-[#c7a852]/25 bg-[#882c30] pt-16 pb-10 sm:pt-20 sm:pb-14 ${className}`}
      style={
        backgroundImage
          ? {
              backgroundColor: "#050505",
              backgroundImage: `url("${backgroundImage}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(120deg, rgba(17,15,14,.84), rgba(17,15,14,.34) 58%, transparent), radial-gradient(circle at 78% 18%, rgba(199,168,82,.12), transparent 24rem)",
        }}
      />

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
