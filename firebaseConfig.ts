import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ============================================================
// COLE SUAS CHAVES DO FIREBASE AQUI
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC331xvyeDUX4s7lrbbmgI3hgiwlj9ZTnw",
  authDomain: "app-trade-junco.firebaseapp.com",
  projectId: "app-trade-junco",
  storageBucket: "app-trade-junco.firebasestorage.app",
  messagingSenderId: "507182321396",
  appId: "1:507182321396:web:1716d8da92381bd47a18a1",
  measurementId: "G-5FD631EE9N"
};

const app = firebaseApp.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);