import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Phase 1 — Boot diagnostics
const url = import.meta.env.VITE_SUPABASE_URL || "";
const ref = url.replace("https://", "").split(".")[0];
console.log("[App Boot] VITE_SUPABASE_URL =", url);
console.log("[App Boot] Project ref =", ref);
console.log("[App Boot] Edge invoke target =", url + "/functions/v1/");
console.log("[App Boot] VITE_SUPABASE_ANON_KEY starts with =", (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").slice(0, 12));

supabase.auth.getSession().then(({ data: { session } }) => {
  console.log("[App Boot] Session exists =", !!session);
  if (session?.access_token) {
    console.log("[App Boot] access_token starts with =", session.access_token.slice(0, 12));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
