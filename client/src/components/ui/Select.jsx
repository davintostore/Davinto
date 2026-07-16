const Select = ({ label, error, children, className = "", ...props }) => {
  return (
    <label className="block">
      {label && (
        <span className="mb-2.5 block text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
          {label}
        </span>
      )}

      <select
        className={`davinto-select w-full rounded-[0.2rem] border border-[#f5f0e8]/16 bg-[#1c1917] px-4 py-3.5 text-sm text-[#f5f0e8] outline-none transition hover:border-[#f5f0e8]/25 focus:border-[#c7a852] ${className}`}
        {...props}
      >
        {children}
      </select>

      {error && <span className="mt-2 block text-xs text-[#e8a3a6]">{error}</span>}
    </label>
  );
};

export default Select;
