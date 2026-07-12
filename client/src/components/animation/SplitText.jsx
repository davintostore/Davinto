import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const DEFAULT_FROM = { opacity: 0, y: 34 };
const DEFAULT_TO = { opacity: 1, y: 0 };
const VALID_SPLIT_TYPES = new Set(["chars", "words", "lines"]);

const splitGraphemes = (value, locale) => {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }

  return Array.from(value);
};

const splitWordsAndSpaces = (value) => value.split(/(\s+)/u).filter(Boolean);

const SplitText = ({
  text,
  as: Tag = "span",
  className = "",
  splitType = "words",
  delay = 0,
  stagger = 0.035,
  duration = 0.9,
  ease = "power3.out",
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  threshold = 0.18,
  rootMargin = "0px 0px -10% 0px",
  textAlign,
  once = true,
  disabled = false,
  onAnimationComplete,
  style,
  ...props
}) => {
  const { i18n } = useTranslation();
  const rootRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const animationKeyRef = useRef("");
  const completeRef = useRef(onAnimationComplete);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const value = String(text ?? "");
  const requestedSplitType = VALID_SPLIT_TYPES.has(splitType)
    ? splitType
    : "words";
  const safeSplitType =
    language === "ar" && requestedSplitType === "chars"
      ? "words"
      : requestedSplitType;
  const animationKey = `${language}:${safeSplitType}:${value}`;
  const fromSignature = JSON.stringify(from);
  const toSignature = JSON.stringify(to);

  useEffect(() => {
    completeRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  const content = useMemo(() => {
    if (safeSplitType === "lines") {
      return value.split("\n").map((line, index) => (
        <span
          key={`line-${index}-${line}`}
          className="block"
          data-split-segment="true"
        >
          {line || "\u00a0"}
        </span>
      ));
    }

    const tokens = splitWordsAndSpaces(value);

    if (safeSplitType === "chars") {
      return tokens.map((token, tokenIndex) => {
        if (/^\s+$/u.test(token)) return token;

        return (
          <span
            key={`word-${tokenIndex}-${token}`}
            className="inline-block whitespace-nowrap"
          >
            {splitGraphemes(token, language).map((character, charIndex) => (
              <span
                key={`char-${tokenIndex}-${charIndex}-${character}`}
                className="inline-block"
                data-split-segment="true"
              >
                {character}
              </span>
            ))}
          </span>
        );
      });
    }

    return tokens.map((token, index) =>
      /^\s+$/u.test(token) ? (
        token
      ) : (
        <span
          key={`word-${index}-${token}`}
          className="inline-block"
          data-split-segment="true"
        >
          {token}
        </span>
      )
    );
  }, [language, safeSplitType, value]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return undefined;

      if (animationKeyRef.current !== animationKey) {
        animationKeyRef.current = animationKey;
        hasAnimatedRef.current = false;
      }

      const segments = gsap.utils.toArray(
        root.querySelectorAll("[data-split-segment='true']")
      );
      if (segments.length === 0) return undefined;

      const motionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      let observer;
      let tween;

      const showFinalState = () => {
        tween?.kill();
        gsap.set(segments, {
          clearProps: "opacity,transform,willChange",
        });
      };

      if (disabled || motionQuery.matches) {
        hasAnimatedRef.current = true;
        showFinalState();
        return undefined;
      }

      if (once && hasAnimatedRef.current) {
        showFinalState();
        return undefined;
      }

      gsap.set(segments, {
        ...from,
      });

      const play = () => {
        tween?.kill();
        gsap.set(segments, { willChange: "transform,opacity" });
        tween = gsap.to(segments, {
          ...to,
          delay,
          duration,
          ease,
          stagger,
          overwrite: "auto",
          onComplete: () => {
            hasAnimatedRef.current = true;
            gsap.set(segments, {
              clearProps: "opacity,transform,willChange",
            });
            completeRef.current?.();
          },
        });
      };

      if (!("IntersectionObserver" in window)) {
        play();
      } else {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              play();
              if (once) observer?.unobserve(entry.target);
            } else if (!once && tween) {
              tween.reverse();
            }
          },
          { rootMargin, threshold }
        );
        observer.observe(root);
      }

      const handleMotionPreference = (event) => {
        if (!event.matches) return;
        observer?.disconnect();
        hasAnimatedRef.current = true;
        showFinalState();
      };

      motionQuery.addEventListener("change", handleMotionPreference);

      return () => {
        observer?.disconnect();
        motionQuery.removeEventListener("change", handleMotionPreference);
        tween?.kill();
      };
    },
    {
      scope: rootRef,
      dependencies: [
        animationKey,
        delay,
        disabled,
        duration,
        ease,
        fromSignature,
        once,
        rootMargin,
        stagger,
        threshold,
        toSignature,
      ],
      revertOnUpdate: true,
    }
  );

  return (
    <Tag
      {...props}
      ref={rootRef}
      className={className}
      style={{ ...style, textAlign }}
      aria-label={value}
      data-split-type={safeSplitType}
    >
      <span aria-hidden="true">{content}</span>
    </Tag>
  );
};

export default SplitText;
