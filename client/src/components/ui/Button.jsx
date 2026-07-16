const variants = {
  primary:
    "border border-[#882c30] bg-[#882c30] text-[#f5f0e8] hover:border-[#c7a852] hover:bg-[#c7a852] hover:text-[#15120f] hover:shadow-[0_0.75rem_1.75rem_rgba(199,168,82,0.2)]",
  secondary:
    "border border-[#c7a852]/55 bg-transparent text-[#f5f0e8] hover:border-[#c7a852] hover:bg-[#c7a852] hover:text-[#110f0e]",
  ghost:
    "border border-[#f5f0e8]/12 bg-[#f5f0e8]/5 text-[#f5f0e8] hover:border-[#c7a852]/55 hover:bg-[#c7a852]/12 hover:text-[#c7a852]",
  danger:
    "border border-[#b8585d]/45 bg-[#882c30]/20 text-[#f5f0e8] hover:border-[#b8585d]/70 hover:bg-[#6f2226]/70",
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
      data-variant={variant}
      className={`davinto-button ${
        variant === "primary" ? "davinto-primary-action" : ""
      } inline-flex min-h-12 items-center justify-center rounded-[0.2rem] px-6 py-3 text-[0.68rem] font-black uppercase tracking-[0.24em] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a852] disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
