import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCstl872xKUcdUwX5aQVFMkpo8v-R-9EoE",
  authDomain: "sitemagnatas01.firebaseapp.com",
  projectId: "sitemagnatas01",
  storageBucket: "sitemagnatas01.firebasestorage.app",
  messagingSenderId: "848648566155",
  appId: "1:848648566155:web:024e93ea5dcecaaef86b8e",
  measurementId: "G-Q57NRPGDVE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
