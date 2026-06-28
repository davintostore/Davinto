import { useTranslation } from "react-i18next";

import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

const getPolicyContent = (t, type) => ({
  path: t(`pages.${type}.path`),
  title: t(`pages.${type}.title`),
  description: t(`pages.${type}.description`),
  sections: t(`pages.${type}.sections`, { returnObjects: true }),
});

const PolicyPage = ({ type }) => {
  const { t } = useTranslation("policies");
  const content = getPolicyContent(t, type);
  const sections = Array.isArray(content.sections) ? content.sections : [];

  useSeo({
    title: `${content.title} | Davinto Store`,
    description: content.description,
    robots: "index,follow",
    canonical: `${window.location.origin}${content.path}`,
  });

  return (
    <>
      <PageHeader
        label={t("supportLabel")}
        title={content.title}
        description={content.description}
        className="pt-12 pb-10 sm:pt-16 sm:pb-14"
        showMeta={false}
      />

      <section className="fashion-section">
        <Container>
          <div className="mx-auto max-w-3xl border-t border-[#f5f0e8]/12">
            {sections.map((section) => (
              <section
                key={section.title}
                className="border-b border-[#f5f0e8]/12 py-8"
              >
                <SectionLabel>{section.title}</SectionLabel>
                <p className="mt-4 text-base leading-8 text-[#f5f0e8]/66">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
};

export const PrivacyPolicy = () => <PolicyPage type="privacy" />;
export const RefundPolicy = () => <PolicyPage type="refund" />;
export const ShippingPolicy = () => <PolicyPage type="shipping" />;
export const TermsAndConditions = () => <PolicyPage type="terms" />;
