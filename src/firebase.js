// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// As tuas credenciais do Firebase (certifica-te de que as tuas chaves estão aqui corretas)
const firebaseConfig = {
  apiKey: "AIzaSyCstl872xKUcdUwX5aQVFMkpo8v-R-9EoE",
  authDomain: "sitemagnatas01.firebaseapp.com",
  projectId: "sitemagnatas01",
  storageBucket: "sitemagnatas01.firebasestorage.app",
  messagingSenderId: "848648566155",
  appId: "1:848648566155:web:024e93ea5dcecaaef86b8e"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e EXPORTA o Auth e o Firestore (importante!)
export const auth = getAuth(app);
export const db = getFirestore(app);
