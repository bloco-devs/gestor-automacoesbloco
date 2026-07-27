import "@/lib/capture-auth-callback";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./hooks/useTheme";
import ErrorBoundary from "./components/ErrorBoundary";
// Geist — fonte padrão da interface (DS 4.0). Só os pesos usados pelas
// classes .ds-* e pelo Tailwind (400 corpo, 500 ênfase, 600 título).
// NewBlackTypeface (index.css) continua existindo só para branding.
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-500.css";
import "@fontsource/geist-sans/latin-600.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="dark">
      <App />
    </ThemeProvider>
  </ErrorBoundary>,
);
