import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Comprehensive SEO hook for title, meta tags, canonical URLs, robots meta, and JSON-LD
 * Usage: useSeo({ title, description, robots, canonical, og, twitter, jsonLd })
 */
const useSeo = ({
  title = "Davinto Store | Premium Everyday Clothing",
  description = "Discover Davinto Store — premium everyday clothing, graphic pieces, blanks, and art-inspired designs made for effortless style.",
  robots = "index,follow",
  canonical = null,
  og = {},
  twitter = {},
  jsonLd = null,
} = {}) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    updateMetaTag("description", description);

    // Update robots meta
    updateMetaTag("robots", robots);

    // Update Open Graph tags
    if (og) {
      updateMetaTag("og:title", og.title || title, "property");
      updateMetaTag("og:description", og.description || description, "property");
      updateMetaTag("og:type", og.type || "website", "property");
      updateMetaTag("og:site_name", og.siteName || "Davinto Store", "property");
      updateMetaTag("og:url", og.url || getCanonicalUrl(canonical), "property");

      if (og.image) {
        updateMetaTag("og:image", og.image, "property");
      } else {
        removeMetaTag("og:image", "property");
      }
    }

    // Update Twitter Card tags
    if (twitter) {
      updateMetaTag("twitter:card", twitter.card || "summary", "name");
      updateMetaTag("twitter:title", twitter.title || title, "name");
      updateMetaTag("twitter:description", twitter.description || description, "name");

      if (twitter.image) {
        updateMetaTag("twitter:image", twitter.image, "name");
      } else {
        removeMetaTag("twitter:image", "name");
      }
    }

    // Update canonical link
    updateCanonicalLink(canonical);

    // Handle JSON-LD structured data
    if (jsonLd) {
      updateJsonLd(jsonLd);
    } else {
      removeJsonLd();
    }

    return () => {
      // Cleanup is handled by next effect
    };
  }, [title, description, robots, canonical, og, twitter, jsonLd, location.pathname]);
};

/**
 * Helper: Update or create a meta tag
 */
const updateMetaTag = (name, content, attr = "name") => {
  if (!content) {
    removeMetaTag(name, attr);
    return;
  }

  let tag = document.querySelector(`meta[${attr}="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
};

/**
 * Helper: Remove a meta tag
 */
const removeMetaTag = (name, attr = "name") => {
  const tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (tag) {
    tag.remove();
  }
};

/**
 * Helper: Update canonical link
 */
const updateCanonicalLink = (customCanonical) => {
  const canonicalUrl = customCanonical || getCanonicalUrl();
  let link = document.querySelector("link[rel='canonical']");

  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }

  link.href = canonicalUrl;
};

/**
 * Helper: Get canonical URL (remove query params for shop/category, use current origin)
 */
const getCanonicalUrl = (customCanonical = null) => {
  if (customCanonical) {
    return customCanonical;
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // Remove query params for public indexable pages
  // For cart, checkout, account, auth, admin - keep as is (they'll be noindex anyway)
  if (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/product/")
  ) {
    // Strip query params for clean canonical
    return `${origin}${pathname}`;
  }

  // For other pages, include pathname but not query params
  return `${origin}${pathname}`;
};

/**
 * Helper: Update JSON-LD structured data (with cleanup)
 */
const updateJsonLd = (jsonLdData) => {
  removeJsonLd();

  if (!jsonLdData) return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.className = "seo-json-ld";
  script.textContent = JSON.stringify(jsonLdData);

  document.head.appendChild(script);
};

/**
 * Helper: Remove JSON-LD scripts
 */
const removeJsonLd = () => {
  const scripts = document.querySelectorAll("script.seo-json-ld");
  scripts.forEach((script) => script.remove());
};

export default useSeo;
