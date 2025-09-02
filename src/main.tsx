import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Small change to trigger reload

createRoot(document.getElementById("root")!).render(<App />);
