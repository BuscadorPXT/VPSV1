import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 🔥 CACHE BUSTING: Force new bundle hash by changing code content
const BUILD_INFO = {
  version: "2025.11.13.1750",
  timestamp: Date.now(),
  fixed: "Auth race condition - retry on 401 instead of setting unapproved"
};

// Log build info in production to verify correct bundle loaded
console.log("🚀 Buscador PXT loaded -", BUILD_INFO.version);

createRoot(document.getElementById("root")!).render(<App />);