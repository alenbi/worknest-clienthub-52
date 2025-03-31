
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA38e5-IDgPca-WgQHmooVPOx2f9LV63xk",
  authDomain: "clientchat-943e8.firebaseapp.com",
  projectId: "clientchat-943e8",
  storageBucket: "clientchat-943e8.appspot.com",
  messagingSenderId: "109525729312",
  appId: "1:109525729312:web:485adbfca9e24f4bc23c45",
  measurementId: "G-VR6JSBFELT",
  databaseURL: "https://clientchat-943e8-default-rtdb.firebaseio.com"
};

// Initialize Firebase
let app;
let database;
let storage;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { app, database, storage };
