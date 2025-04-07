import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set some global theme variables for consistent styling
document.documentElement.style.setProperty('--radius', '0.5rem');

createRoot(document.getElementById("root")!).render(<App />);
