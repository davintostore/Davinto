const Input = ({ label, error, className = "", ...props }) => {
  return (
    <label className="block">
      {label && (
        <span className="mb-2.5 block text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
          {label}
        </span>
      )}

      <input
        className={`davinto-input w-full rounded-[0.2rem] border border-[#f5f0e8]/16 bg-[#f5f0e8]/5 px-4 py-3.5 text-sm text-[#f5f0e8] outline-none transition placeholder:text-[#8b8075] hover:border-[#f5f0e8]/25 focus:border-[#c7a852] focus:bg-[#f5f0e8]/8 ${className}`}
        {...props}
      />

      {error && <span className="mt-2 block text-xs text-[#e8a3a6]">{error}</span>}
    </label>
  );
};

export default Input;
