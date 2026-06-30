import { useCallback, useEffect, useState } from "react";

const canAnimate = () => {
  if (typeof window === "undefined") return false;

  return (
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
};

const useScrollReveal = (options = {}) => {
  const {
    rootMargin = "0px 0px -10% 0px",
    threshold = 0.12,
  } = options;
  const [node, setNode] = useState(null);
  const [isVisible, setIsVisible] = useState(() => !canAnimate());
  const revealRef = useCallback((element) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!canAnimate()) {
      return undefined;
    }

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setIsVisible(true);
        observer.unobserve(entry.target);
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, rootMargin, threshold]);

  return [
    revealRef,
    `davinto-reveal${isVisible ? " davinto-reveal--visible" : ""}`,
    isVisible,
  ];
};

export default useScrollReveal;
