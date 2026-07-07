import { useEffect, useRef } from "react";

const OVERLAY_STATE_KEY = "davintoOverlay";

const getCurrentUrl = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

const getOverlayState = () => window.history.state?.[OVERLAY_STATE_KEY];

const removeOverlayState = (state = {}) => {
  const rest = { ...(state || {}) };

  delete rest[OVERLAY_STATE_KEY];
  return rest;
};

const useOverlayBackClose = ({ isOpen, onClose, overlayId }) => {
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const hasHistoryEntryRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = (event) => {
      if (hasHistoryEntryRef.current && isOpenRef.current) {
        hasHistoryEntryRef.current = false;
        onCloseRef.current();
        return;
      }

      if (
        !isOpenRef.current &&
        event.state?.[OVERLAY_STATE_KEY] === overlayId
      ) {
        window.history.replaceState(
          removeOverlayState(event.state),
          "",
          getCurrentUrl()
        );
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [overlayId]);

  useEffect(() => {
    if (typeof window === "undefined" || !overlayId) return;

    if (isOpen) {
      if (!hasHistoryEntryRef.current && getOverlayState() !== overlayId) {
        window.history.pushState(
          {
            ...(window.history.state || {}),
            [OVERLAY_STATE_KEY]: overlayId,
          },
          "",
          getCurrentUrl()
        );
      }

      hasHistoryEntryRef.current = true;
      return;
    }

    if (!hasHistoryEntryRef.current) return;

    hasHistoryEntryRef.current = false;

    if (getOverlayState() === overlayId) {
      window.history.back();
    }
  }, [isOpen, overlayId]);
};

export default useOverlayBackClose;
