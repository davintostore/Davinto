import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { useCart } from "../../context/cartContext";

const CartToast = () => {
  const { cartToast } = useCart();

  if (!cartToast || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cart-toast-panel fixed left-auto right-4 top-[7rem] z-[130] flex min-h-11 w-fit max-w-[calc(100vw-2rem)] items-center justify-center gap-2 whitespace-nowrap border border-[#c7a852]/25 bg-[#080706]/95 px-4 py-2.5 text-[#f5f0e8] shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur sm:right-6 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[18rem]"
      role="status"
      aria-live="polite"
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c7a852]/35 bg-[#c7a852]/10 text-[#c7a852]"
        aria-hidden="true"
      >
        <Check size={13} strokeWidth={2.5} />
      </span>
      <span className="text-sm font-bold leading-none text-[#f5f0e8]">
        {cartToast.title}
      </span>
    </div>,
    document.body
  );
};

export default CartToast;
