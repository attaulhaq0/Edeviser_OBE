import { createRoot } from "react-dom/client";
import App from "./App";
import SupabaseApp from "./SupabaseApp";
import "./index.css";

// Use Supabase version by default - you can change this to switch between versions
const USE_SUPABASE = true;

createRoot(document.getElementById("root")!).render(
  USE_SUPABASE ? <SupabaseApp /> : <App />
);
