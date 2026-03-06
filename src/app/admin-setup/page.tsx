'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Shield, Loader2 } from 'lucide-react';

const ADMIN_CPF = '00000000000'; // CPF especial para admin
const ADMIN_EMAIL = 'admin@passaporte.com';
const ADMIN_PASSWORD = 'Admin@123';

export default function AdminSetupPage() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const router = useRouter();

  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const handleCreateAdmin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // First try to sign in (in case user already exists)
      try {
        const signInResult = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        
        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', signInResult.user.uid));
        
        if (!userDoc.exists()) {
          // Create user document
          await setDoc(doc(db, 'users', signInResult.user.uid), {
            uid: signInResult.user.uid,
            email: ADMIN_EMAIL,
            cpf: ADMIN_CPF,
            role: 'admin',
            createdAt: serverTimestamp()
          });
        }
        
        setMessage({ 
          type: 'success', 
          text: 'Admin já existe! Login realizado. Redirecionando...' 
        });

        setTimeout(() => {
          router.push('/admin');
        }, 1500);
        return;
        
      } catch {
        // User doesn't exist, create new one
      }

      // Create new admin user
      const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      
      // Create admin document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: ADMIN_EMAIL,
        cpf: ADMIN_CPF,
        role: 'admin',
        createdAt: serverTimestamp()
      });

      setMessage({ 
        type: 'success', 
        text: 'Admin criado com sucesso! Redirecionando para o painel...' 
      });

      setTimeout(() => {
        router.push('/admin');
      }, 1500);
      
    } catch (error: unknown) {
      console.error('Erro completo:', error);
      
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          errorMessage = 'Este email já está em uso. Tente fazer login.';
        } else if (error.message.includes('weak-password')) {
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = 'Email inválido.';
        } else if (error.message.includes('auth/')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002776] to-[#009639] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#002776] to-[#009639] rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-[#002776]">Configuração Inicial</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Clique no botão abaixo para criar ou acessar o usuário administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={
              message.type === 'success' ? 'border-green-300 bg-green-50' : 
              message.type === 'info' ? 'border-blue-300 bg-blue-50' : 
              'border-red-300 bg-red-50'
            }>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : message.type === 'info' ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={
                message.type === 'success' ? 'text-green-800' : 
                message.type === 'info' ? 'text-blue-800' : 
                'text-red-800'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Email do Admin</Label>
            <Input
              value={ADMIN_EMAIL}
              disabled
              className="bg-gray-50 text-sm sm:text-base h-11 sm:h-12"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Senha do Admin</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-sm sm:text-base h-11 sm:h-12"
            />
            <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
          </div>
          
          <Button
            onClick={handleCreateAdmin}
            className="w-full bg-[#009639] hover:bg-[#007a2f] py-5 sm:py-6 text-base sm:text-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 sm:h-5 w-4 sm:w-5 animate-spin" />
                Processando...
              </>
            ) : (
              'Criar / Acessar Admin'
            )}
          </Button>
          
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Este botão cria o usuário admin OU faz login se já existir
            </p>
            <a href="/login" className="text-xs sm:text-sm text-[#002776] hover:underline">
              Ir para página de Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
