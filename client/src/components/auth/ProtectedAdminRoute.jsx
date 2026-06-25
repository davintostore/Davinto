import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/adminAuthContext";

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, isCheckingAuth } = useAdminAuth();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-[#f7f3ea]">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-white/40">
            Davinto Admin
          </p>
          <h1 className="editorial-heading mt-4 text-5xl font-black">
            Checking
          </h1>
          <p className="mt-4 text-sm text-white/45">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
};

export default ProtectedAdminRoute;
