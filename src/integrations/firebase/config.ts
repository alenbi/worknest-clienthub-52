
import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// Firebase configuration - using public API keys which are safe to be in client code
const firebaseConfig = {
  apiKey: "AIzaSyBi_1c5r9wuig28-iIIJAGDCVJKuTT1UdM",
  authDomain: "lovable-chat-demo.firebaseapp.com",
  databaseURL: "https://lovable-chat-demo-default-rtdb.firebaseio.com",
  projectId: "lovable-chat-demo",
  storageBucket: "lovable-chat-demo.appspot.com",
  messagingSenderId: "850569471086",
  appId: "1:850569471086:web:d9e80ff7c3936b5dddf35f"
};

// Create a fallback database object that logs errors instead of crashing
const createErrorHandlerDatabase = () => {
  const errorHandler = (methodName: string) => (...args: any[]) => {
    console.error(`Firebase ${methodName} failed because Firebase failed to initialize`);
    return Promise.reject(new Error("Firebase not initialized"));
  };
  
  // Return a mock database object that won't crash the app
  return {
    ref: errorHandler("ref"),
    get: errorHandler("get"),
    set: errorHandler("set"),
    update: errorHandler("update"),
    push: errorHandler("push"),
    onValue: errorHandler("onValue"),
    off: errorHandler("off")
  } as any;
};

// Declare the database variable at module level to be exported
let database;

// Initialize Firebase
try {
  console.log("Initializing Firebase app...");
  const app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully");
  
  // Initialize Realtime Database
  console.log("Connecting to Firebase Realtime Database...");
  database = getDatabase(app);
  
  // Use local emulator if running in development and environment variable is set
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
    console.log("Using Firebase local emulator");
    connectDatabaseEmulator(database, "localhost", 9000);
  }
  
  console.log("Firebase Realtime Database connected successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Use fallback database if Firebase initialization fails
  database = createErrorHandlerDatabase();
}

// Export the database instance
export { database };
