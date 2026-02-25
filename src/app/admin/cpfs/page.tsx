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
  Pencil,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface AuthorizedCpf {
  id: string;
  cpf: string;
  addedBy: string;
  addedAt: { seconds: number } | null;
  hasAccount: boolean;
  email: string;
  userId: string;
  blocked: boolean;
  clientName?: string;
}

const DEFAULT_PASSWORD = '123456';

export default function ManageCpfsPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [cpfs, setCpfs] = useState<AuthorizedCpf[]>([]);
  const [filteredCpfs, setFilteredCpfs] = useState<AuthorizedCpf[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cpfToDelete, setCpfToDelete] = useState<string | null>(null);
  const [cpfToEdit, setCpfToEdit] = useState<AuthorizedCpf | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    fetchCpfs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = cpfs.filter(c => 
        c.id.includes(searchTerm.replace(/\D/g, '')) || 
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCpfs(filtered);
    } else {
      setFilteredCpfs(cpfs);
    }
  }, [searchTerm, cpfs]);

  const fetchCpfs = async () => {
    try {
      const q = query(collection(db, 'authorized_cpfs'), orderBy('addedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuthorizedCpf[];
      
      // Fetch client names from formularios collection
      const formulariosQ = query(collection(db, 'formularios'));
      const formulariosSnapshot = await getDocs(formulariosQ);
      const formulariosMap = new Map<string, string>();
      
      formulariosSnapshot.docs.forEach(doc => {
        const formData = doc.data();
        const cpf = doc.id;
        const clientCpf = formData.cpf?.replace(/\D/g, '');
        if (clientCpf && formData.dados?.fullName) {
          formulariosMap.set(clientCpf, formData.dados.fullName);
        }
      });
      
      // Merge client names into CPFs data
      const dataWithNames = data.map(cpfData => ({
        ...cpfData,
        clientName: formulariosMap.get(cpfData.id) || undefined
      }));
      
      setCpfs(dataWithNames);
      setFilteredCpfs(dataWithNames);
    } catch (error) {
      console.error('Erro ao buscar CPFs:', error);
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

  const generateEmailFromCPF = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    return `${cleanCpf}@passaporte.com`;
  };

  const handleAddCpf = async () => {
    setMessage(null);
    const cleanCpf = newCpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) {
      setMessage({ type: 'error', text: 'CPF deve ter 11 dígitos.' });
      return;
    }

    // Check if CPF already exists
    const exists = cpfs.find(c => c.id === cleanCpf);
    if (exists) {
      setMessage({ type: 'error', text: 'Este CPF já está cadastrado.' });
      return;
    }

    setSubmitting(true);
    try {
      const email = generateEmailFromCPF(cleanCpf);
      
      // Use Firebase REST API to create user without affecting admin session
      const apiKey = "AIzaSyBtmRymondW0EVj06CiIUsvWMaz-QWv9OI";
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: DEFAULT_PASSWORD,
            returnSecureToken: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.message === 'EMAIL_EXISTS') {
          setMessage({ type: 'error', text: 'Este CPF já tem uma conta associada.' });
          setSubmitting(false);
          return;
        }
        throw new Error(errorData.error?.message || 'Erro ao criar usuário');
      }

      const userData = await response.json();
      const newUserId = userData.localId;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', newUserId), {
        uid: newUserId,
        email: email,
        cpf: cleanCpf,
        role: 'user',
        createdAt: serverTimestamp()
      });

      // Create authorized_cpfs document
      await setDoc(doc(db, 'authorized_cpfs', cleanCpf), {
        cpf: cleanCpf,
        addedBy: user?.uid,
        addedAt: serverTimestamp(),
        hasAccount: true,
        email: email,
        userId: newUserId,
        blocked: false
      });
      
      setMessage({ 
        type: 'success', 
        text: `CPF cadastrado com sucesso! Login: ${email} | Senha: ${DEFAULT_PASSWORD}` 
      });
      setNewCpf('');
      fetchCpfs();
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
    if (!cpfToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'authorized_cpfs', cpfToDelete));
      setMessage({ type: 'success', text: 'CPF removido com sucesso!' });
      setDialogOpen(false);
      setCpfToDelete(null);
      fetchCpfs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover CPF.' });
    }
  };

  const handleToggleBlock = async (cpf: AuthorizedCpf) => {
    try {
      const newBlockedStatus = !cpf.blocked;
      await updateDoc(doc(db, 'authorized_cpfs', cpf.id), {
        blocked: newBlockedStatus
      });
      
      setMessage({ 
        type: 'success', 
        text: newBlockedStatus ? 'Acesso bloqueado com sucesso!' : 'Acesso liberado com sucesso!' 
      });
      fetchCpfs();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ type: 'error', text: 'Erro ao alterar status de acesso.' });
    }
  };

  const openEditDialog = (cpf: AuthorizedCpf) => {
    setCpfToEdit(cpf);
    setEditEmail(cpf.email || '');
    setEditDialogOpen(true);
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
                <h1 className="text-xl font-bold">Gerenciar CPFs</h1>
                <p className="text-sm text-white/80">SB Viagens e Turismo</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="text-white border-white hover:bg-white hover:text-[#623AA2]">
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
              Gerenciar CPFs
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Informações de Acesso</p>
                <p className="text-sm text-blue-700 mt-1">
                  Ao cadastrar um CPF, o sistema cria automaticamente uma conta com:
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Login:</strong> <code className="bg-blue-100 px-1 rounded">CPF@passaporte.com</code> (apenas números)
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

        {/* CPF List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#623AA2]">Clientes Cadastrados ({cpfs.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar CPF..."
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
                    <TableHead>Login</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Cadastro</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCpfs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum cliente cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCpfs.map((cpf) => (
                      <TableRow key={cpf.id}>
                        <TableCell className="font-medium truncate max-w-[180px]">{cpf.clientName || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCPF(cpf.id)}</TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">{cpf.email || generateEmailFromCPF(cpf.id)}</TableCell>
                        <TableCell>
                          {cpf.blocked ? (
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
                        <TableCell>{formatDate(cpf.addedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cpf.blocked ? "text-green-600 hover:bg-green-50" : "text-orange-600 hover:bg-orange-50"}
                              onClick={() => handleToggleBlock(cpf)}
                              title={cpf.blocked ? "Liberar acesso" : "Bloquear acesso"}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setCpfToDelete(cpf.id);
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
              Tem certeza que deseja remover o CPF <strong>{cpfToDelete && formatCPF(cpfToDelete)}</strong>?
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              CPF: <strong>{cpfToEdit && formatCPF(cpfToEdit.id)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Login</Label>
              <Input
                value={cpfToEdit?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha Padrão</Label>
              <Input
                value={DEFAULT_PASSWORD}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
