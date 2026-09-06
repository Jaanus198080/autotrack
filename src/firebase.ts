import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZCkPOtI5mB5unXSyB4IsHhBz3zvxJWRs",
  authDomain: "autotrack-ffa8a.firebaseapp.com",
  projectId: "autotrack-ffa8a",
  storageBucket: "autotrack-ffa8a.firebasestorage.app",
  messagingSenderId: "498694180940",
  appId: "1:498694180940:web:be11daf50017c7ce8c64e9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
