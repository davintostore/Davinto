import { useEffect } from "react";

import Button from "./Button";

const ConfirmDialog = ({
  isOpen,
  eyebrow = "Confirm",
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  isPending = false,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isPending) {
        onCancel?.();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] grid place-items-center bg-[#050505]/78 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={cancelLabel}
        disabled={isPending}
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md border border-[#c7a852]/28 bg-[#110f0e] p-6 shadow-2xl">
        {eyebrow && (
          <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
            {eyebrow}
          </p>
        )}

        <h2
          id="confirm-dialog-title"
          className="mt-3 font-serif text-3xl font-semibold text-[#f5f0e8]"
        >
          {title}
        </h2>

        {message && (
          <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/58">
            {message}
          </p>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
