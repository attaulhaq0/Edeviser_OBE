import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SupabaseApp from "./SupabaseApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SupabaseApp />
  </StrictMode>
);
