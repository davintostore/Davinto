import Button from "./Button";
import useFocusTrap from "../../hooks/useFocusTrap";

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
  const dialogRef = useFocusTrap({
    isActive: isOpen,
    onEscape: () => {
      if (!isPending) {
        onCancel?.();
      }
    },
    lockScroll: true,
  });

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[140] grid place-items-center bg-[#050505]/78 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={message ? "confirm-dialog-message" : undefined}
      tabIndex={-1}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={cancelLabel}
        disabled={isPending}
        tabIndex={-1}
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
          <p
            id="confirm-dialog-message"
            className="mt-3 text-sm leading-7 text-[#f5f0e8]/58"
          >
            {message}
          </p>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onCancel}
            data-autofocus
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
