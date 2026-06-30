const StickerLabel = ({ children, className = "" }) => (
  <p
    className={`inline-flex w-fit rotate-[-5deg] bg-[#d6b35d] px-3 py-1 font-sans text-[0.74rem] font-bold leading-none text-[#1c1917] shadow-[0_0.35rem_1rem_rgba(5,5,5,0.22)] ${className}`}
  >
    {children}
  </p>
);

export default StickerLabel;
