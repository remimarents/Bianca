
// Firebase init (Firestore)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu-yTJpbWG3cmgUiyKAba7AgthLDq6ULU",
  authDomain: "tetris-356b1.firebaseapp.com",
  projectId: "tetris-356b1",
  storageBucket: "tetris-356b1.firebasestorage.app",
  messagingSenderId: "606847504898",
  appId: "1:606847504898:web:4a610c1d3bc43c24b68d1b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
