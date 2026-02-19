'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  cpf: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (cpf: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createAdminIfNotExists: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin email
const ADMIN_EMAIL = 'admin@passaporte.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else if (user.email === ADMIN_EMAIL) {
          // Create admin document if it doesn't exist
          const adminData: UserData = {
            uid: user.uid,
            email: user.email,
            cpf: '00000000000',
            role: 'admin',
            createdAt: new Date()
          };
          await setDoc(doc(db, 'users', user.uid), adminData);
          setUserData(adminData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
  };

  const createUser = async (cpf: string, email: string, password: string) => {
    // Check if CPF is authorized
    const cleanCpf = cpf.replace(/\D/g, '');
    const cpfDoc = await getDoc(doc(db, 'authorized_cpfs', cleanCpf));
    
    if (!cpfDoc.exists()) {
      throw new Error('CPF não autorizado. Entre em contato com a administração.');
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      cpf: cleanCpf,
      role: 'user',
      createdAt: serverTimestamp()
    });

    // Update authorized_cpfs to mark as having account
    await setDoc(doc(db, 'authorized_cpfs', cleanCpf), {
      ...cpfDoc.data(),
      hasAccount: true,
      email: email,
      userId: userCredential.user.uid
    }, { merge: true });
  };

  const createAdminIfNotExists = async (email: string, password: string) => {
    if (email !== ADMIN_EMAIL) {
      throw new Error('Este email não é autorizado como administrador.');
    }

    try {
      // Try to create admin user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create admin document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        cpf: '00000000000',
        role: 'admin',
        createdAt: serverTimestamp()
      });
    } catch (error: unknown) {
      // If user already exists, just sign in
      if (error instanceof Error && error.message.includes('email-already-in-use')) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw error;
      }
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signIn,
      signOut,
      createUser,
      resetPassword,
      createAdminIfNotExists
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
