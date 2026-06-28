import { useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(container.querySelectorAll(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      Boolean(
        element.offsetWidth ||
          element.offsetHeight ||
          element.getClientRects().length
      )
  );
};

const focusElement = (element) => {
  if (!element || typeof element.focus !== "function") return;

  element.focus({
    preventScroll: true,
  });
};

const useFocusTrap = ({
  isActive,
  onEscape,
  initialFocusSelector = "[data-autofocus]",
  restoreFocus = true,
  lockScroll = false,
  lockHtmlScroll = false,
} = {}) => {
  const containerRef = useRef(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (
      !isActive ||
      typeof document === "undefined" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const previouslyFocusedElement =
      typeof HTMLElement !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    if (lockHtmlScroll) {
      document.documentElement.style.overflow = "hidden";
    }

    const focusInitialElement = () => {
      const currentContainer = containerRef.current;

      if (!currentContainer) return;

      const explicitTarget = initialFocusSelector
        ? currentContainer.querySelector(initialFocusSelector)
        : null;
      const [firstFocusable] = getFocusableElements(currentContainer);

      focusElement(explicitTarget || firstFocusable || currentContainer);
    };

    const frameId = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event) => {
      const currentContainer = containerRef.current;

      if (!currentContainer) return;

      if (event.key === "Escape") {
        onEscapeRef.current?.(event);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(currentContainer);

      if (!focusableElements.length) {
        event.preventDefault();
        focusElement(currentContainer);
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (
          activeElement === firstElement ||
          !currentContainer.contains(activeElement)
        ) {
          event.preventDefault();
          focusElement(lastElement);
        }

        return;
      }

      if (
        activeElement === lastElement ||
        !currentContainer.contains(activeElement)
      ) {
        event.preventDefault();
        focusElement(firstElement);
      }
    };

    const handleFocusIn = (event) => {
      const currentContainer = containerRef.current;

      if (!currentContainer || currentContainer.contains(event.target)) return;

      const [firstFocusable] = getFocusableElements(currentContainer);
      focusElement(firstFocusable || currentContainer);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn);

      if (lockScroll) {
        document.body.style.overflow = originalBodyOverflow;
      }

      if (lockHtmlScroll) {
        document.documentElement.style.overflow = originalHtmlOverflow;
      }

      if (
        restoreFocus &&
        previouslyFocusedElement &&
        previouslyFocusedElement.isConnected
      ) {
        focusElement(previouslyFocusedElement);
      }
    };
  }, [
    initialFocusSelector,
    isActive,
    lockHtmlScroll,
    lockScroll,
    restoreFocus,
  ]);

  return containerRef;
};

export default useFocusTrap;
