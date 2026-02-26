import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[App Boot] VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
console.log("[App Boot] VITE_SUPABASE_ANON_KEY starts with =", (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").slice(0, 12));
console.log("[App Boot] Edge invoke target =", import.meta.env.VITE_SUPABASE_URL + "/functions/v1/");

createRoot(document.getElementById("root")!).render(<App />);
