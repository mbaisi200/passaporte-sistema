'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';

// Interface para dados do usuário admin (Firebase)
interface AdminUserData {
  uid: string;
  email: string;
  cpf: string;
  role: 'admin';
  createdAt: Date;
}

// Interface para dados do cliente (banco local)
interface ClienteData {
  id: string;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
}

// Tipo unificado de usuário
type UserType = 'admin' | 'cliente';

interface AuthContextType {
  // Firebase user (admin)
  user: FirebaseUser | null;
  userData: AdminUserData | null;
  loading: boolean;
  
  // Cliente user (banco local)
  cliente: ClienteData | null;
  clienteLoading: boolean;
  
  // Tipo de usuário logado
  userType: UserType | null;
  
  // Admin methods
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAdminIfNotExists: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Cliente methods
  signInCliente: (cpf: string, password: string) => Promise<void>;
  signOutCliente: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin email
const ADMIN_EMAIL = 'admin@passaporte.com';

// Chave do localStorage para cliente
const CLIENTE_STORAGE_KEY = 'passaporte_cliente';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AdminUserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [clienteLoading, setClienteLoading] = useState(true);
  
  const [userType, setUserType] = useState<UserType | null>(null);

  // Firebase auth state listener (para admin)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === 'admin') {
            setUserData(data as AdminUserData);
            setUserType('admin');
          }
        } else if (user.email === ADMIN_EMAIL) {
          // Create admin document if it doesn't exist
          const adminData: AdminUserData = {
            uid: user.uid,
            email: user.email,
            cpf: '00000000000',
            role: 'admin',
            createdAt: new Date()
          };
          await setDoc(doc(firestore, 'users', user.uid), adminData);
          setUserData(adminData);
          setUserType('admin');
        }
      } else {
        setUserData(null);
        if (!cliente) {
          setUserType(null);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cliente]);

  // Load cliente from localStorage (para clientes)
  useEffect(() => {
    const storedCliente = localStorage.getItem(CLIENTE_STORAGE_KEY);
    if (storedCliente) {
      try {
        const parsed = JSON.parse(storedCliente);
        setCliente(parsed);
        setUserType('cliente');
      } catch {
        localStorage.removeItem(CLIENTE_STORAGE_KEY);
      }
    }
    setClienteLoading(false);
  }, []);

  // Admin sign in
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign out (both admin and cliente)
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
    setUserType(null);
  };

  // Cliente sign in
  const signInCliente = async (cpf: string, password: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    const response = await fetch('/api/clientes/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cleanCpf, senha: password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();
    setCliente(data.cliente);
    setUserType('cliente');
    localStorage.setItem(CLIENTE_STORAGE_KEY, JSON.stringify(data.cliente));
  };

  // Cliente sign out
  const signOutCliente = () => {
    setCliente(null);
    setUserType(null);
    localStorage.removeItem(CLIENTE_STORAGE_KEY);
  };

  // Create admin if not exists
  const createAdminIfNotExists = async (email: string, password: string) => {
    if (email !== ADMIN_EMAIL) {
      throw new Error('Este email não é autorizado como administrador.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        cpf: '00000000000',
        role: 'admin',
        createdAt: serverTimestamp()
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('email-already-in-use')) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw error;
      }
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      cliente,
      clienteLoading,
      userType,
      signIn,
      signOut,
      createAdminIfNotExists,
      resetPassword,
      signInCliente,
      signOutCliente
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
