import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtmRymondW0EVj06CiIUsvWMaz-QWv9OI",
  authDomain: "passaporte-2c4b1.firebaseapp.com",
  projectId: "passaporte-2c4b1",
  storageBucket: "passaporte-2c4b1.firebasestorage.app",
  messagingSenderId: "161804817884",
  appId: "1:161804817884:web:3f26a841e6d3246110ab19"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
