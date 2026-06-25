const variants = {
  primary:
    "border border-[#882c30] bg-[#882c30] text-[#f5f0e8] hover:border-[#a33b40] hover:bg-[#a33b40]",
  secondary:
    "border border-[#c7a852]/55 bg-transparent text-[#f5f0e8] hover:border-[#c7a852] hover:bg-[#c7a852]/10",
  ghost:
    "border border-[#f5f0e8]/12 bg-[#f5f0e8]/5 text-[#f5f0e8] hover:border-[#f5f0e8]/25 hover:bg-[#f5f0e8]/9",
  danger:
    "border border-[#b8585d]/45 bg-[#882c30]/20 text-[#f5f0e8] hover:bg-[#882c30]/35",
};

const Button = ({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) => {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center rounded-[0.2rem] px-6 py-3 text-[0.68rem] font-black uppercase tracking-[0.24em] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-[#c7a852] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
