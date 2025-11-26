// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdJ1oZ5Wdm0Dsts27dcimYf1BAY5m543Y",
  authDomain: "attendanceapp-6abcb.firebaseapp.com",
  projectId: "attendanceapp-6abcb",
  storageBucket: "attendanceapp-6abcb.firebasestorage.app",
  messagingSenderId: "849169932083",
  appId: "1:849169932083:web:b4c22d965b436eae512846"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };



