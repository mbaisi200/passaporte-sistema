'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, LogIn, Loader2, Mail, CreditCard } from 'lucide-react';

export default function LoginPage() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState<'cpf' | 'email'>('cpf');
  const { signIn, user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/formulario');
      }
    }
  }, [user, userData, authLoading, router]);

  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const unmaskCPF = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const generateEmailFromCPF = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    return `${cleanCpf}@passaporte.com`;
  };

  const handleInputChange = (value: string) => {
    // Detecta se é email (contém @)
    if (value.includes('@')) {
      setInputType('email');
      setLoginInput(value);
    } else {
      setInputType('cpf');
      setLoginInput(maskCPF(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let email: string;

    if (inputType === 'email') {
      // Admin login com email direto
      email = loginInput.trim();
      if (!email.includes('@') || !email.includes('.')) {
        setError('Digite um email válido.');
        return;
      }
    } else {
      // Cliente login com CPF
      const cleanCpf = unmaskCPF(loginInput);
      if (cleanCpf.length !== 11) {
        setError('Digite um CPF válido com 11 dígitos.');
        return;
      }
      email = generateEmailFromCPF(loginInput);
    }

    setLoading(true);

    try {
      await signIn(email, password);
      // Wait for auth state to update - useEffect will handle redirect
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('auth/user-not-found') || err.message.includes('auth/invalid-credential')) {
          setError(inputType === 'email' 
            ? 'Email não encontrado ou senha incorreta.' 
            : 'CPF não encontrado ou senha incorreta.');
        } else if (err.message.includes('auth/wrong-password')) {
          setError('Senha incorreta. Tente novamente.');
        } else if (err.message.includes('auth/invalid-email')) {
          setError(inputType === 'email' ? 'Email inválido.' : 'CPF inválido.');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos.');
        } else {
          setError('Erro ao fazer login. Verifique seus dados.');
        }
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002776] to-[#009639] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#002776] to-[#009639] rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl sm:text-2xl">SB</span>
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-[#002776]">Acesso ao Sistema</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Digite seu CPF e senha para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login" className="text-sm sm:text-base">
                  {inputType === 'email' ? 'Email' : 'CPF'}
                </Label>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  {inputType === 'email' ? (
                    <>
                      <Mail className="h-3 w-3" />
                      Modo Admin
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3 w-3" />
                      Modo Cliente
                    </>
                  )}
                </span>
              </div>
              <Input
                id="login"
                type="text"
                inputMode={inputType === 'cpf' ? 'numeric' : 'email'}
                placeholder={inputType === 'email' ? "admin@passaporte.com" : "000.000.000-00"}
                value={loginInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="text-base sm:text-lg h-12"
                required
              />
              <p className="text-xs text-gray-500">
                {inputType === 'cpf' 
                  ? 'Admin? Digite seu email completo (ex: admin@passaporte.com)' 
                  : 'Cliente? Digite apenas os números do CPF'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-base sm:text-lg h-12"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-[#009639] hover:bg-[#007a2f] h-12 text-base sm:text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
            <p>Não tem acesso?</p>
            <p className="text-xs sm:text-sm">Entre em contato com a agência para realizar seu cadastro.</p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs sm:text-sm text-gray-500 hover:text-gray-700">
              ← Voltar para página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
