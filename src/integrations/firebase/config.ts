
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
