'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  UserPlus, 
  Trash2, 
  ArrowLeft,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface Cliente {
  id: string;
  cpf: string;
  nome: string | null;
  email: string | null;
  senha: string;
  blocked: boolean;
  addedBy: string;
  addedAt: { seconds: number } | null;
}

const DEFAULT_PASSWORD = '123456';

export default function ManageClientesPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clientes.filter(c => 
        c.cpf.includes(searchTerm.replace(/\D/g, '')) || 
        (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes(clientes);
    }
  }, [searchTerm, clientes]);

  const fetchClientes = async () => {
    try {
      // Buscar da coleção 'clientes' no Firestore
      const q = query(collection(db, 'clientes'), orderBy('addedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[];
      
      // Sort: Active first (by date desc), then Blocked (by date desc)
      const sortedData = data.sort((a, b) => {
        if (a.blocked !== b.blocked) {
          return a.blocked ? 1 : -1;
        }
        const dateA = a.addedAt?.seconds || 0;
        const dateB = b.addedAt?.seconds || 0;
        return dateB - dateA;
      });
      
      setClientes(sortedData);
      setFilteredClientes(sortedData);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleAddCpf = async () => {
    setMessage(null);
    const cleanCpf = newCpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) {
      setMessage({ type: 'error', text: 'CPF deve ter 11 dígitos.' });
      return;
    }

    // Check if CPF already exists
    const exists = clientes.find(c => c.cpf === cleanCpf);
    if (exists) {
      setMessage({ type: 'error', text: 'Este CPF já está cadastrado.' });
      return;
    }

    setSubmitting(true);
    try {
      // Criar cliente na coleção 'clientes' do Firestore (sem Firebase Auth)
      await setDoc(doc(db, 'clientes', cleanCpf), {
        cpf: cleanCpf,
        nome: null,
        email: null,
        senha: DEFAULT_PASSWORD,
        blocked: false,
        addedBy: user?.uid,
        addedAt: serverTimestamp()
      });
      
      setMessage({ 
        type: 'success', 
        text: `Cliente cadastrado com sucesso! Login: ${cleanCpf} | Senha: ${DEFAULT_PASSWORD}` 
      });
      setNewCpf('');
      fetchClientes();
    } catch (error: unknown) {
      console.error('Erro:', error);
      if (error instanceof Error) {
        setMessage({ type: 'error', text: `Erro: ${error.message}` });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCpf = async () => {
    if (!clienteToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'clientes', clienteToDelete));
      setMessage({ type: 'success', text: 'Cliente removido com sucesso!' });
      setDialogOpen(false);
      setClienteToDelete(null);
      fetchClientes();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover cliente.' });
    }
  };

  const handleToggleBlock = async (cliente: Cliente) => {
    try {
      const newBlockedStatus = !cliente.blocked;
      await updateDoc(doc(db, 'clientes', cliente.cpf), {
        blocked: newBlockedStatus
      });
      
      setMessage({ 
        type: 'success', 
        text: newBlockedStatus ? 'Acesso bloqueado com sucesso!' : 'Acesso liberado com sucesso!' 
      });
      fetchClientes();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ type: 'error', text: 'Erro ao alterar status de acesso.' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const formatDate = (timestamp: { seconds: number } | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009639]"></div>
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
                <h1 className="text-xl font-bold">Gerenciar Clientes</h1>
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
              className="border-b-2 border-[#F97794] text-[#623AA2]"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Gerenciar Clientes
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/formularios')}
            >
              Formulários
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/migrar')}
            >
              Migrar Dados
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Informações de Acesso</p>
                <p className="text-sm text-blue-700 mt-1">
                  Ao cadastrar um CPF, o cliente pode acessar o sistema com:
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Login:</strong> <code className="bg-blue-100 px-1 rounded">CPF (apenas números)</code>
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Senha padrão:</strong> <code className="bg-blue-100 px-1 rounded">123456</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add CPF Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#623AA2]">
              <UserPlus className="h-5 w-5" />
              Cadastrar Novo Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newCpf">CPF do Cliente *</Label>
                <Input
                  id="newCpf"
                  value={newCpf}
                  onChange={(e) => setNewCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddCpf}
                  className="w-full bg-gradient-to-r from-[#F97794] to-[#623AA2] hover:opacity-90"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Cadastrar Cliente'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clientes List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#623AA2]">Clientes Cadastrados ({clientes.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar CPF ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Nome</TableHead>
                    <TableHead className="w-[140px]">CPF</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Cadastro</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum cliente cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium truncate max-w-[180px]">{cliente.nome || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCPF(cliente.cpf)}</TableCell>
                        <TableCell>
                          {cliente.blocked ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded">
                              <XCircle className="h-4 w-4" />
                              Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                              <CheckCircle className="h-4 w-4" />
                              Ativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(cliente.addedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cliente.blocked ? "text-green-600 hover:bg-green-50" : "text-orange-600 hover:bg-orange-50"}
                              onClick={() => handleToggleBlock(cliente)}
                              title={cliente.blocked ? "Liberar acesso" : "Bloquear acesso"}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setClienteToDelete(cliente.cpf);
                                setDialogOpen(true);
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o cliente <strong>{clienteToDelete && formatCPF(clienteToDelete)}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCpf}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
