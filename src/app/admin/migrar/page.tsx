'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  ArrowRightLeft
} from 'lucide-react';

interface MigrationResult {
  success: boolean;
  message: string;
  resumo?: {
    clientesMigrados: number;
    clientesIgnorados: number;
    formulariosMigrados: number;
    formulariosIgnorados: number;
  };
}

export default function MigrarPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  const handleMigration = async () => {
    setMigrating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/migrate/firestore-to-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: 'migrate-cpfs-2024' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na migração');
      }

      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido na migração');
      }
    } finally {
      setMigrating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#623AA2]"></div>
      </div>
    );
  }

  if (!user || userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#623AA2] to-[#F97794] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#623AA2] font-bold">SB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Migração de Dados</h1>
                <p className="text-sm text-white/80">SB Viagens e Turismo</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="bg-white/20 text-white border-white hover:bg-white hover:text-[#623AA2] font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/cpfs')}
            >
              Gerenciar Clientes
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/formularios')}
            >
              Formulários
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#623AA2]">
              <ArrowRightLeft className="h-5 w-5" />
              Migrar CPFs do Firestore para Banco Local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Database className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>O que esta migração faz:</strong>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li>Transfere CPFs cadastrados no Firestore (authorized_cpfs) para o banco local SQLite</li>
                  <li>Transfere formulários do Firestore para o banco local</li>
                  <li>Apenas CPFs com formato válido (11 dígitos) são migrados</li>
                  <li>Define senha padrão "123456" para todos os clientes migrados</li>
                  <li>Mantém o status de bloqueio de cada cliente</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Importante:</strong> Esta operação não remove os dados do Firestore. 
                Os clientes já cadastrados no banco local serão ignorados (não duplicados).
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{result.message}</strong>
                  {result.resumo && (
                    <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                      <div className="bg-green-100 p-2 rounded">
                        <span className="font-medium">Clientes migrados:</span> {result.resumo.clientesMigrados}
                      </div>
                      <div className="bg-green-100 p-2 rounded">
                        <span className="font-medium">Clientes ignorados:</span> {result.resumo.clientesIgnorados}
                      </div>
                      <div className="bg-green-100 p-2 rounded">
                        <span className="font-medium">Formulários migrados:</span> {result.resumo.formulariosMigrados}
                      </div>
                      <div className="bg-green-100 p-2 rounded">
                        <span className="font-medium">Formulários ignorados:</span> {result.resumo.formulariosIgnorados}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleMigration}
                disabled={migrating}
                className="flex-1 bg-gradient-to-r from-[#623AA2] to-[#F97794] hover:opacity-90"
              >
                {migrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Executar Migração
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#623AA2]">Informações do Novo Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Clientes (CPF)</strong>
                  <p className="text-gray-600">Agora são armazenados no banco local SQLite, não mais no Firebase Authentication</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Login de Clientes</strong>
                  <p className="text-gray-600">Login apenas com CPF + senha, sem necessidade de email @passaporte.com</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Admin</strong>
                  <p className="text-gray-600">Continua usando Firebase Authentication (email: admin@passaporte.com)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Formulários</strong>
                  <p className="text-gray-600">Agora salvos no banco local, vinculados ao cliente pelo CPF</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
