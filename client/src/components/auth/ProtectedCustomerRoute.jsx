import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useCustomerAuth } from "../../context/customerAuthContext";

const ProtectedCustomerRoute = ({ children }) => {
  const { t } = useTranslation("auth");
  const { isCustomerAuthenticated, isCustomerLoading } = useCustomerAuth();
  const location = useLocation();

  if (isCustomerLoading) {
    return (
      <section className="fashion-section min-h-[60vh]">
        <div className="mx-auto flex min-h-[45vh] max-w-3xl items-center justify-center px-5 text-center">
          <div>
            <p className="text-[0.64rem] font-black uppercase tracking-[0.3em] text-[#c7a852]">
              {t("protected.label")}
            </p>
            <h1 className="editorial-heading mt-5 text-6xl sm:text-8xl">
              {t("protected.title")}
            </h1>
            <p className="mt-6 text-sm text-[#f5f0e8]/48">
              {t("protected.description")}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!isCustomerAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
};

export default ProtectedCustomerRoute;
