import { NavLink, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { TelemetryErrorBoundary } from "./components/TelemetryErrorBoundary";
import { AboutPage } from "./routes/AboutPage";
import { DiagnosticsPage } from "./routes/DiagnosticsPage";
import { ObservabilityPage } from "./routes/ObservabilityPage";
import { ProductsPage } from "./routes/ProductsPage";
import { StatusPage } from "./routes/StatusPage";

export function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <header className="header">
          <p className="brand">HATHOR Integration Console</p>
          <nav aria-label="Primary">
            <NavLink to="/" end>
              Status
            </NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/diagnostics">Diagnostics</NavLink>
            <NavLink to="/observability">Observability</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
        </header>
        <main className="main">
          <TelemetryErrorBoundary source="AppLayout">
            <Routes>
              <Route path="/" element={<StatusPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/observability" element={<ObservabilityPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </TelemetryErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
