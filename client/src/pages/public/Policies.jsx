import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

const policyContent = {
  privacy: {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How Davinto handles basic order, contact, and customer service information.",
    sections: [
      {
        title: "Information we collect",
        body: "When you place an order or contact Davinto, we collect the details needed to process and support your request, such as name, phone number, email, delivery address, selected items, payment method, and order notes.",
      },
      {
        title: "How we use information",
        body: "We use this information to confirm orders, arrange delivery, provide customer support, improve the store experience, and keep accurate order records.",
      },
      {
        title: "Sharing",
        body: "We only share order details where needed to complete the service, such as delivery handling or payment processing. We do not sell customer contact information.",
      },
    ],
  },
  refund: {
    path: "/refund-policy",
    title: "Refund Policy",
    description:
      "A clear, practical overview of how Davinto reviews return, exchange, and refund requests.",
    sections: [
      {
        title: "Request review",
        body: "Refunds, exchanges, or return requests are reviewed based on the order details, item condition, and the nature of the issue. Please contact Davinto with your order number as soon as possible if something is wrong.",
      },
      {
        title: "Item condition",
        body: "Items should be unused, clean, and in their original condition when a return or exchange is requested. Davinto may be unable to support requests for items that show wear, damage, or missing packaging.",
      },
      {
        title: "Order issues",
        body: "If you receive an incorrect or damaged item, contact us with photos and your order number so the team can review the issue and propose the appropriate next step.",
      },
    ],
  },
  shipping: {
    path: "/shipping-policy",
    title: "Shipping Policy",
    description:
      "Delivery coverage and fees for Davinto orders across Egypt.",
    sections: [
      {
        title: "Coverage",
        body: "Davinto delivers across Egypt. Delivery availability and timing may vary by address, order details, and courier operations.",
      },
      {
        title: "Delivery fees",
        body: "Cairo and Giza delivery fee is 70 EGP. Other governorates delivery fee is 120 EGP. Any qualifying free-delivery offer or discount is recalculated securely at checkout.",
      },
      {
        title: "Order confirmation",
        body: "Please enter accurate phone and address details at checkout. The team may contact you to confirm details before dispatch.",
      },
    ],
  },
  terms: {
    path: "/terms-and-conditions",
    title: "Terms & Conditions",
    description:
      "General terms for shopping through Davinto Store.",
    sections: [
      {
        title: "Orders",
        body: "By placing an order, you confirm that the information provided is accurate and that you are authorized to use the selected payment method.",
      },
      {
        title: "Products",
        body: "Davinto aims to present product information, colors, prices, and availability clearly. Actual colors can vary slightly by screen, lighting, and photography.",
      },
      {
        title: "Pricing and availability",
        body: "Prices, stock, offers, bundles, delivery fees, and checkout totals are calculated through the store systems and may be updated before an order is confirmed.",
      },
      {
        title: "Customer support",
        body: "For order questions, delivery issues, or product concerns, contact Davinto with the relevant order number so the team can assist.",
      },
    ],
  },
};

const PolicyPage = ({ content }) => {
  useSeo({
    title: `${content.title} | Davinto Store`,
    description: content.description,
    robots: "index,follow",
    canonical: `${window.location.origin}${content.path}`,
  });

  return (
    <>
      <PageHeader
        label="Davinto Support"
        title={content.title}
        description={content.description}
        className="pt-12 pb-10 sm:pt-16 sm:pb-14"
        showMeta={false}
      />

      <section className="fashion-section">
        <Container>
          <div className="mx-auto max-w-3xl border-t border-[#f5f0e8]/12">
            {content.sections.map((section) => (
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

export const PrivacyPolicy = () => <PolicyPage content={policyContent.privacy} />;
export const RefundPolicy = () => <PolicyPage content={policyContent.refund} />;
export const ShippingPolicy = () => <PolicyPage content={policyContent.shipping} />;
export const TermsAndConditions = () => <PolicyPage content={policyContent.terms} />;
