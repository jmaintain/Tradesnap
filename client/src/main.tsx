import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeIndexedDB, performFullSync } from "./lib/indexedDB";

// Set some global theme variables for consistent styling
document.documentElement.style.setProperty('--radius', '0.5rem');

// Initialize IndexedDB
async function initializeApp() {
  try {
    // First initialize the IndexedDB database and schema
    await initializeIndexedDB();
    console.log("IndexedDB initialized successfully");
    
    // Note: Synchronization temporarily disabled until sync implementation is fixed
    // Will enable this in a future update
    // await performFullSync();
    // console.log("Data synchronized successfully");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
}

// Start the application
initializeApp();

// Render the app regardless of initialization status
createRoot(document.getElementById("root")!).render(<App />);

// Add an event listener to sync data when the app regains focus (user returns to tab)
// Temporarily disabled until sync implementation is fixed
/*
window.addEventListener('focus', () => {
  console.log("Window regained focus, syncing data...");
  performFullSync().catch(error => {
    console.error("Error syncing data on focus:", error);
  });
});
*/
