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
}) => {
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <section
      className={`relative overflow-hidden border-b border-[#c7a852]/25 bg-[#882c30] pt-28 pb-16 sm:pt-36 sm:pb-24 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(120deg, rgba(17,15,14,.82), transparent 58%), repeating-linear-gradient(90deg, transparent 0, transparent 79px, rgba(245,240,232,.06) 80px)",
        }}
      />

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1fr_240px] lg:items-end">
          <div>
            {label && <SectionLabel>{label}</SectionLabel>}

            <div className="max-w-5xl">
              <h1 className="editorial-heading text-6xl text-[#f5f0e8] sm:text-8xl lg:text-[7.4rem]">
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

          <div className="hidden border-l border-[#f5f0e8]/25 pl-6 lg:block">
            <p className="brand-wordmark text-4xl text-[#c7a852]">D/01</p>
            <p className="mt-3 text-[0.65rem] font-black uppercase leading-5 tracking-[0.28em] text-[#f5f0e8]/55">
              {isAdminPage
                ? "Davinto seasonal catalogue"
                : t("seasonalCatalogue")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default PageHeader;
