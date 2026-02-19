'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  collection,
  updateDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  FileText, 
  ArrowLeft,
  LogOut,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';

interface Formulario {
  id: string;
  userId: string;
  cpf: string;
  dados: {
    fullName: string;
    email: string;
    phone: string;
    [key: string]: string;
  };
  createdAt: { seconds: number } | null;
  status: string;
}

export default function FormulariosPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedForm, setSelectedForm] = useState<Formulario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user && userData?.role === 'admin') {
      const q = query(collection(db, 'formularios'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Formulario[];
        setFormularios(data);
      });

      return () => unsubscribe();
    }
  }, [user, userData, loading, router]);

  const filteredFormularios = useMemo(() => {
    let filtered = formularios;
    
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.cpf?.includes(searchTerm.replace(/\D/g, '')) ||
        f.dados?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.dados?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }
    
    return filtered;
  }, [searchTerm, statusFilter, formularios]);

  const handleStatusChange = async (formId: string, newStatus: string, formCpf: string) => {
    try {
      // Update form status
      await updateDoc(doc(db, 'formularios', formId), {
        status: newStatus
      });

      // If status is "processado", block the user access
      if (newStatus === 'processado' && formCpf) {
        const cleanCpf = formCpf.replace(/\D/g, '');
        await updateDoc(doc(db, 'authorized_cpfs', cleanCpf), {
          blocked: true
        });
      }

      // If status changes back to "pendente", unblock
      if (newStatus === 'pendente' && formCpf) {
        const cleanCpf = formCpf.replace(/\D/g, '');
        await updateDoc(doc(db, 'authorized_cpfs', cleanCpf), {
          blocked: false
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatDate = (timestamp: { seconds: number } | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
  };

  const formatDateForm = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const generateTxtFile = (form: Formulario) => {
    const d = form.dados;
    
    let content = `FORMULÁRIO PARA EMISSÃO DE PASSAPORTE BRASILEIRO\n`;
    content += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    content += `==================================================\n\n`;

    content += `1. DADOS PESSOAIS\n`;
    content += `------------------\n`;
    content += `NOME COMPLETO: ${d.fullName || '-'}\n`;
    if(d.previousName) content += `NOME ANTERIOR: ${d.previousName}\n`;
    if(d.nameChangeReason) content += `MOTIVO ALTERAÇÃO: ${d.nameChangeReason}\n`;
    content += `NOME DA MÃE: ${d.motherName || '-'}\n`;
    if(d.fatherName) content += `NOME DO PAI: ${d.fatherName}\n`;
    content += `DATA DE NASCIMENTO: ${formatDateForm(d.birthDate || '')}\n`;
    content += `NATURALIDADE: ${d.birthCity || '-'}${d.birthState ? '/' + d.birthState : ''}\n`;
    content += `SEXO: ${d.gender === 'M' ? 'MASCULINO' : d.gender === 'F' ? 'FEMININO' : '-'}\n`;
    content += `COR/RAÇA: ${d.skinColor || '-'}\n`;
    content += `ESTADO CIVIL: ${d.maritalStatus || '-'}\n`;
    if(d.responsibleCpf) content += `CPF DO RESPONSÁVEL: ${d.responsibleCpf}\n`;

    content += `\n2. DOCUMENTAÇÃO\n`;
    content += `----------------\n`;
    content += `CPF: ${formatCPF(form.cpf)}\n`;
    content += `RG: ${d.rg || '-'}\n`;
    content += `ÓRGÃO EXPEDIDOR: ${d.rgIssuer || '-'}\n`;
    content += `DATA EXPEDIÇÃO RG: ${formatDateForm(d.rgIssueDate || '')}\n`;
    content += `POSSUI PASSAPORTE ANTERIOR: ${d.previousPassport || '-'}\n`;
    if(d.previousPassport === 'SIM') {
      content += `SÉRIE PASSAPORTE: ${d.passportSeries || '-'}\n`;
      content += `NÚMERO PASSAPORTE: ${d.passportNumber || '-'}\n`;
      content += `SITUAÇÃO: ${d.passportStatus || '-'}\n`;
    }

    content += `\n3. CERTIDÃO\n`;
    content += `-----------\n`;
    content += `TIPO: ${d.certificateType || '-'}\n`;
    content += `MODELO: ${d.certificateModel === 'NOVO' ? 'MODELO NOVO' : d.certificateModel === 'ANTIGO' ? 'MODELO ANTIGO' : '-'}\n`;
    if(d.certificateModel === 'NOVO') {
      content += `NÚMERO CERTIDÃO: ${d.certificateNumberNew || '-'}\n`;
    } else if(d.certificateModel === 'ANTIGO') {
      content += `NÚMERO: ${d.certificateNumberOld || '-'}\n`;
      content += `LIVRO: ${d.certificateBook || '-'}\n`;
      content += `FOLHA: ${d.certificatePage || '-'}\n`;
    }

    content += `\n4. CONTATO E ENDEREÇO\n`;
    content += `----------------------\n`;
    content += `ENDEREÇO: ${d.address || '-'}\n`;
    content += `BAIRRO: ${d.neighborhood || '-'}\n`;
    content += `CIDADE: ${d.city || '-'}\n`;
    content += `ESTADO: ${d.state || '-'}\n`;
    content += `CEP: ${d.zipCode || '-'}\n`;
    content += `TELEFONE: ${d.phone || '-'}\n`;
    content += `E-MAIL: ${d.email || '-'}\n`;
    content += `PROFISSÃO: ${d.profession || '-'}\n`;

    if(d.travelAuthorization) {
      content += `\n5. AUTORIZAÇÃO DE VIAGEM (MENOR)\n`;
      content += `----------------------------------\n`;
      content += `${d.travelAuthorization}\n`;
    }

    content += `\n6. INFORMAÇÕES ADICIONAIS\n`;
    content += `----------------------------\n`;
    content += `TIPO PASSAPORTE: ${d.passportType || '-'}\n`;

    content += `\n==================================================\n`;
    content += `SB TURISMO E VIAGENS\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PASSAPORTE_${(d.fullName || 'CLIENTE').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFormDetails = () => {
    if (!selectedForm) return null;
    
    const { dados } = selectedForm;
    
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Nome Completo</p>
            <p className="font-semibold">{dados.fullName || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">CPF</p>
            <p className="font-semibold">{formatCPF(selectedForm.cpf)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="font-semibold">{dados.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Telefone</p>
            <p className="font-semibold">{dados.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Data de Nascimento</p>
            <p className="font-semibold">{formatDateForm(dados.birthDate || '')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Naturalidade</p>
            <p className="font-semibold">{dados.birthCity || '-'}{dados.birthState ? '/' + dados.birthState : ''}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Nome da Mãe</p>
            <p className="font-semibold">{dados.motherName || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Nome do Pai</p>
            <p className="font-semibold">{dados.fatherName || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">RG</p>
            <p className="font-semibold">{dados.rg || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Órgão Expedidor</p>
            <p className="font-semibold">{dados.rgIssuer || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Endereço</p>
            <p className="font-semibold">{dados.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cidade/UF</p>
            <p className="font-semibold">{dados.city}/{dados.state}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Profissão</p>
            <p className="font-semibold">{dados.profession || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tipo Passaporte</p>
            <p className="font-semibold">{dados.passportType || '-'}</p>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-500">Certidão</p>
          <p className="font-semibold">
            {dados.certificateType || '-'}
            {' - '}
            {dados.certificateModel === 'NOVO' ? 'Modelo Novo' : 
             dados.certificateModel === 'ANTIGO' ? 'Modelo Antigo' : '-'}
          </p>
        </div>
        
        {dados.previousPassport === 'SIM' && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-500 mb-2">Passaporte Anterior</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Série</p>
                <p>{dados.passportSeries || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Número</p>
                <p>{dados.passportNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Situação</p>
                <p>{dados.passportStatus || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
      <header className="bg-[#002776] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#002776] font-bold">SB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Formulários Recebidos</h1>
                <p className="text-sm text-blue-200">SB Viagens e Turismo</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="text-white border-white hover:bg-white hover:text-[#002776]">
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
              className="text-gray-600 hover:text-[#002776]"
              onClick={() => router.push('/admin')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#002776]"
              onClick={() => router.push('/admin/cpfs')}
            >
              Gerenciar CPFs
            </Button>
            <Button
              variant="ghost"
              className="border-b-2 border-[#009639] text-[#002776]"
            >
              <FileText className="mr-2 h-4 w-4" />
              Formulários
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="text-[#002776]">
                Formulários ({formularios.length})
              </CardTitle>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="processado">Processado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFormularios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum formulário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFormularios.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.dados?.fullName || '-'}</TableCell>
                        <TableCell className="font-mono">{formatCPF(form.cpf)}</TableCell>
                        <TableCell>{form.dados?.email || '-'}</TableCell>
                        <TableCell>{formatDate(form.createdAt)}</TableCell>
                        <TableCell>
                          <Select
                            value={form.status}
                            onValueChange={(v) => handleStatusChange(form.id, v, form.cpf)}
                          >
                            <SelectTrigger className={`w-32 ${
                              form.status === 'pendente' 
                                ? 'border-yellow-400 text-yellow-700' 
                                : 'border-green-400 text-green-700'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                  Pendente
                                </div>
                              </SelectItem>
                              <SelectItem value="processado">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Processado
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateTxtFile(form)}
                              title="Baixar TXT"
                            >
                              <Download className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedForm(form);
                                setDialogOpen(true);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
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

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#002776]">Detalhes do Formulário</DialogTitle>
          </DialogHeader>
          {renderFormDetails()}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {selectedForm && (
              <Button 
                className="bg-[#009639] hover:bg-[#007a2f]"
                onClick={() => {
                  generateTxtFile(selectedForm);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar TXT
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
