import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDujlYXMKpUxVHCFjTzDdiVYzvgI83R6AE",
  authDomain: "fire9516.firebaseapp.com",
  projectId: "fire9516",
  storageBucket: "fire9516.firebasestorage.app",
  messagingSenderId: "256020146789",
  appId: "1:256020146789:web:32c1ab6bdde1222291748c",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
