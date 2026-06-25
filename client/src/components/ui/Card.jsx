const Card = ({ children, className = "" }) => {
  return (
    <div className={`fashion-card rounded-[0.35rem] p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
