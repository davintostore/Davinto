const SectionLabel = ({ children, className = "" }) => {
  return (
    <div className={`mb-5 flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-[#c7a852]" aria-hidden="true" />
      <p className="text-[0.66rem] font-black uppercase tracking-[0.32em] text-[#c7a852]">
        {children}
      </p>
    </div>
  );
};

export default SectionLabel;
