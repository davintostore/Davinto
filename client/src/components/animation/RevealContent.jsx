import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const getOffset = (direction, distance) => {
  if (direction === "down") return { y: -distance };
  if (direction === "left") return { x: distance };
  if (direction === "right") return { x: -distance };
  return { y: distance };
};

const RevealContent = ({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  duration = 0.78,
  distance = 28,
  direction = "up",
  opacity = 0,
  scale = 0.985,
  ease = "power3.out",
  threshold = 0.14,
  rootMargin = "0px 0px -8% 0px",
  once = true,
  disabled = false,
  onAnimationComplete,
  ...props
}) => {
  const rootRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const completeRef = useRef(onAnimationComplete);

  useEffect(() => {
    completeRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return undefined;

      const motionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      let observer;
      let tween;

      const showFinalState = () => {
        tween?.kill();
        gsap.set(root, {
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

      gsap.set(root, {
        ...getOffset(direction, distance),
        opacity,
        scale,
      });

      const play = () => {
        tween?.kill();
        gsap.set(root, { willChange: "transform,opacity" });
        tween = gsap.to(root, {
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          delay,
          duration,
          ease,
          overwrite: "auto",
          onComplete: () => {
            hasAnimatedRef.current = true;
            gsap.set(root, {
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
        delay,
        disabled,
        direction,
        distance,
        duration,
        ease,
        once,
        opacity,
        rootMargin,
        scale,
        threshold,
      ],
      revertOnUpdate: true,
    }
  );

  return (
    <Tag {...props} ref={rootRef} className={className}>
      {children}
    </Tag>
  );
};

export default RevealContent;
