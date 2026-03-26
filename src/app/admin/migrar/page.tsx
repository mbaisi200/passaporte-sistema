'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  ArrowRightLeft,
  Upload,
  FileJson,
  List
} from 'lucide-react';

interface MigrationResult {
  success: boolean;
  message: string;
  resumo?: {
    clientesMigrados: number;
    clientesIgnorados: number;
    adminIgnorados: number;
  };
}

export default function MigrarPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  
  // State for manual CPF input
  const [manualCpfs, setManualCpfs] = useState('');
  
  // State for JSON upload
  const [jsonData, setJsonData] = useState('');
  
  // State for migration
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for viewing existing clientes
  const [existingClientes, setExistingClientes] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const handleManualMigration = async () => {
    setError(null);
    setResult(null);

    const cpfLines = manualCpfs.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (cpfLines.length === 0) {
      setError('Digite pelo menos um CPF.');
      return;
    }

    // Parse CPFs - extract only numbers
    const cpfs = cpfLines.map(line => line.replace(/\D/g, '')).filter(cpf => cpf.length === 11);
    
    if (cpfs.length === 0) {
      setError('Nenhum CPF válido encontrado. Use o formato: 000.000.000-00 ou apenas números.');
      return;
    }

    // Create fake authUsers structure for the API
    const authUsers = cpfs.map(cpf => ({
      uid: cpf,
      email: `${cpf}@passaporte.com`,
      displayName: null
    }));

    await runMigration(authUsers);
  };

  const handleJsonMigration = async () => {
    setError(null);
    setResult(null);

    if (!jsonData.trim()) {
      setError('Cole os dados JSON exportados do Firebase.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonData);
      
      // Handle different JSON formats from Firebase export
      let authUsers: Array<{ uid: string; email: string; displayName: string | null }> = [];
      
      if (Array.isArray(parsed)) {
        authUsers = parsed;
      } else if (parsed.users && Array.isArray(parsed.users)) {
        authUsers = parsed.users;
      } else if (typeof parsed === 'object') {
        // Might be a single user object
        authUsers = [parsed];
      }

      if (authUsers.length === 0) {
        setError('Nenhum usuário encontrado no JSON.');
        return;
      }

      await runMigration(authUsers);
    } catch {
      setError('JSON inválido. Verifique o formato.');
      return;
    }
  };

  const runMigration = async (authUsers: Array<{ uid: string; email: string; displayName: string | null }>) => {
    setMigrating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/migrate/auth-to-firestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminKey: 'migrate-cpfs-2024',
          authUsers 
        })
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
                <h1 className="text-xl font-bold">Migração de CPFs</h1>
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Migração: Firebase Auth → Firestore</p>
                <p className="text-sm text-blue-700 mt-1">
                  Esta migração transfere CPFs do <strong>Firebase Authentication</strong> para a coleção 
                  <code className="bg-blue-100 px-1 rounded mx-1">clientes</code> no <strong>Firestore</strong>.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Após a migração, os clientes poderão fazer login usando apenas o CPF (sem o email @passaporte.com).
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Senha padrão:</strong> <code className="bg-blue-100 px-1 rounded">123456</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista de CPFs
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON (Firebase Export)
            </TabsTrigger>
          </TabsList>

          {/* Manual CPF Input Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#623AA2]">
                  <List className="h-5 w-5" />
                  Digitar CPFs Manualmente
                </CardTitle>
                <CardDescription>
                  Digite os CPFs que deseja migrar (um por linha). Use o formato 000.000.000-00 ou apenas números.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manualCpfs">Lista de CPFs</Label>
                  <Textarea
                    id="manualCpfs"
                    placeholder="000.000.000-00&#10;111.111.111-11&#10;222.222.222-22"
                    value={manualCpfs}
                    onChange={(e) => setManualCpfs(e.target.value)}
                    rows={8}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Digite um CPF por linha. CPFs já existentes serão ignorados.
                  </p>
                </div>

                <Button
                  onClick={handleManualMigration}
                  disabled={migrating || !manualCpfs.trim()}
                  className="w-full bg-gradient-to-r from-[#623AA2] to-[#F97794] hover:opacity-90"
                >
                  {migrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Migrar CPFs para Firestore
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JSON Upload Tab */}
          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#623AA2]">
                  <FileJson className="h-5 w-5" />
                  Importar JSON do Firebase
                </CardTitle>
                <CardDescription>
                  Cole os dados JSON exportados do Firebase Console (Authentication → Users → Export).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Como exportar usuários do Firebase:</strong>
                    <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                      <li>Acesse o Firebase Console</li>
                      <li>Vá em Authentication → Users</li>
                      <li>Clique em "Exportar usuários" (ou copie os dados manualmente)</li>
                      <li>Cole o JSON abaixo</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="jsonData">Dados JSON</Label>
                  <Textarea
                    id="jsonData"
                    placeholder='{"users": [{"uid": "abc123", "email": "00000000000@passaporte.com", ...}]}'
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleJsonMigration}
                  disabled={migrating || !jsonData.trim()}
                  className="w-full bg-gradient-to-r from-[#623AA2] to-[#F97794] hover:opacity-90"
                >
                  {migrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Processar JSON e Migrar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Result Display */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="mt-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{result.message}</strong>
              {result.resumo && (
                <div className="mt-3 text-sm grid grid-cols-3 gap-2">
                  <div className="bg-green-100 p-2 rounded text-center">
                    <div className="font-bold text-lg">{result.resumo.clientesMigrados}</div>
                    <div>Migrados</div>
                  </div>
                  <div className="bg-yellow-100 p-2 rounded text-center">
                    <div className="font-bold text-lg">{result.resumo.clientesIgnorados}</div>
                    <div>Ignorados</div>
                  </div>
                  <div className="bg-blue-100 p-2 rounded text-center">
                    <div className="font-bold text-lg">{result.resumo.adminIgnorados}</div>
                    <div>Admins</div>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Info Card - New System */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-[#623AA2]">Como Funciona o Novo Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Clientes (CPF)</strong>
                  <p className="text-gray-600">Agora são armazenados no Firestore (coleção &quot;clientes&quot;), não mais no Firebase Authentication</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Login de Clientes</strong>
                  <p className="text-gray-600">Login apenas com CPF + senha, sem necessidade de email</p>
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
                  <strong>Segurança</strong>
                  <p className="text-gray-600">CPFs não são mais criados no Authentication, evitando conflitos e limites</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
