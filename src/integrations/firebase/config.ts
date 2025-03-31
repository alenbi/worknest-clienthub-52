
import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// Firebase configuration - using the provided configuration
const firebaseConfig = {
  apiKey: "AIzaSyA38e5-IDgPca-WgQHmooVPOx2f9LV63xk",
  authDomain: "clientchat-943e8.firebaseapp.com",
  projectId: "clientchat-943e8",
  storageBucket: "clientchat-943e8.firebasestorage.app",
  messagingSenderId: "109525729312",
  appId: "1:109525729312:web:485adbfca9e24f4bc23c45",
  measurementId: "G-VR6JSBFELT",
  databaseURL: "https://clientchat-943e8-default-rtdb.firebaseio.com" // Added the databaseURL you provided
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
