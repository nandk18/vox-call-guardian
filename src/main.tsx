import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;

try {
  createRoot(rootEl).render(<App />);
} catch (e) {
  console.error("Fatal render error:", e);
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d0f14;color:white;font-family:sans-serif;text-align:center;padding:2rem;">
      <div>
        <p style="font-size:2rem;">⚠️</p>
        <h1 style="font-size:1.25rem;margin:1rem 0;">Failed to start app</h1>
        <p style="color:#888;font-size:0.875rem;">${e instanceof Error ? e.message : "Unknown error"}</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;background:#00e5a0;color:#0d0f14;border:none;border-radius:9999px;font-weight:600;cursor:pointer;">Reload</button>
      </div>
    </div>
  `;
}
