import { NavLink, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { AboutPage } from "./routes/AboutPage";
import { DiagnosticsPage } from "./routes/DiagnosticsPage";
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
            <NavLink to="/about">About</NavLink>
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<StatusPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
