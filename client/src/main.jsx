import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./i18n";
import "./index.css";
import App from "./App.jsx";
import LanguageDirectionProvider from "./components/i18n/LanguageDirectionProvider.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { CustomerAuthProvider } from "./context/CustomerAuthContext.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageDirectionProvider>
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </CustomerAuthProvider>
        </AdminAuthProvider>
      </QueryClientProvider>
    </LanguageDirectionProvider>
  </StrictMode>
);
