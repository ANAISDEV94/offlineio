import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[App Boot] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
