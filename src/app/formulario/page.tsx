'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  FileText, 
  User, 
  CreditCard, 
  FileCheck, 
  MapPin, 
  Briefcase,
  Plane,
  Settings,
  AlertCircle,
  LogOut,
  CheckCircle2,
  Loader2,
  XCircle
} from 'lucide-react';

interface FormData {
  fullName: string;
  previousName: string;
  nameChangeReason: string;
  motherName: string;
  fatherName: string;
  birthDate: string;
  birthCity: string;
  birthState: string;
  gender: string;
  skinColor: string;
  maritalStatus: string;
  responsibleCpf: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  rgIssueDate: string;
  previousPassport: string;
  passportSeries: string;
  passportNumber: string;
  passportStatus: string;
  certificateType: string;
  certificateModel: string;
  certificateNumberNew: string;
  certificateNumberOld: string;
  certificateBook: string;
  certificatePage: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  profession: string;
  travelAuthorization: string;
  passportType: string;
}

export default function FormularioPage() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    previousName: '',
    nameChangeReason: '',
    motherName: '',
    fatherName: '',
    birthDate: '',
    birthCity: '',
    birthState: '',
    gender: '',
    skinColor: '',
    maritalStatus: '',
    responsibleCpf: '',
    cpf: '',
    rg: '',
    rgIssuer: '',
    rgIssueDate: '',
    previousPassport: '',
    passportSeries: '',
    passportNumber: '',
    passportStatus: '',
    certificateType: '',
    certificateModel: '',
    certificateNumberNew: '',
    certificateNumberOld: '',
    certificateBook: '',
    certificatePage: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    profession: '',
    travelAuthorization: '',
    passportType: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    
    // Check if user is blocked and pre-fill CPF
    if (!loading && user && userData?.cpf) {
      const checkBlocked = async () => {
        const cpfDoc = await getDoc(doc(db, 'authorized_cpfs', userData.cpf));
        if (cpfDoc.exists() && cpfDoc.data().blocked) {
          setBlocked(true);
        }
      };
      checkBlocked();
      
      // Pre-fill CPF from logged in user
      const formattedCpf = userData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      setFormData(prev => ({ ...prev, cpf: formattedCpf }));
    }
  }, [user, loading, router, userData]);

  const toUpper = (value: string) => value.toUpperCase();
  
  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const maskCEP = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
  };

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    return v;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.toUpperCase()
    }));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowReview(true);
  };

  const cleanDataForStorage = (data: FormData) => {
    return {
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      responsibleCpf: data.responsibleCpf ? data.responsibleCpf.replace(/\D/g, '') : '',
      zipCode: data.zipCode ? data.zipCode.replace(/\D/g, '') : '',
      phone: data.phone ? data.phone.replace(/\D/g, '') : '',
    };
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      // Clean data before saving (remove formatting from numbers)
      const cleanedData = cleanDataForStorage(formData);
      
      // Save to Firestore
      await addDoc(collection(db, 'formularios'), {
        userId: user?.uid,
        cpf: userData?.cpf,
        dados: cleanedData,
        createdAt: serverTimestamp(),
        status: 'pendente'
      });

      setSuccess(true);
      setShowReview(false);
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009639] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002776] to-[#009639] p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#002776] mb-2">Formulário Enviado!</h2>
            <p className="text-gray-600 mb-6">
              Seus dados foram enviados com sucesso. 
              Nossa equipe entrará em contato em breve para dar continuidade ao processo.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleSignOut}
                className="w-full bg-[#009639] hover:bg-[#007a2f]"
              >
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002776] to-[#009639] p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#002776] mb-2">Acesso Encerrado</h2>
            <p className="text-gray-600 mb-6">
              Seu processo já foi finalizado. Se precisar de mais informações, 
              entre em contato com nossa equipe.
            </p>
            <Button 
              onClick={handleSignOut}
              className="w-full bg-[#009639] hover:bg-[#007a2f]"
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review screen before submission
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const getGenderLabel = (gender: string) => {
    if (gender === 'M') return 'Masculino';
    if (gender === 'F') return 'Feminino';
    return '-';
  };

  if (showReview) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#002776] to-[#009639] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">SB</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#002776]">SB Viagens e Turismo</h1>
                  <p className="text-sm text-gray-500">Revise seus dados antes de enviar</p>
                </div>
              </div>
            </div>
          </div>

          <Alert className="mb-6 border-yellow-300 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Atenção:</strong> Confira todos os dados abaixo antes de enviar o formulário. 
              Se houver algum erro, clique em "Voltar e Corrigir".
            </AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <User className="h-5 w-5" />
                1. Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-gray-500">Nome Completo:</span><br />{formData.fullName || '-'}</div>
                {formData.previousName && <div><span className="font-medium text-gray-500">Nome Anterior:</span><br />{formData.previousName}</div>}
                {formData.nameChangeReason && <div><span className="font-medium text-gray-500">Motivo Alteração:</span><br />{formData.nameChangeReason}</div>}
                <div><span className="font-medium text-gray-500">Nome da Mãe:</span><br />{formData.motherName || '-'}</div>
                <div><span className="font-medium text-gray-500">Nome do Pai:</span><br />{formData.fatherName || '-'}</div>
                <div><span className="font-medium text-gray-500">Data de Nascimento:</span><br />{formatDateDisplay(formData.birthDate)}</div>
                <div><span className="font-medium text-gray-500">Naturalidade:</span><br />{formData.birthCity || '-'}{formData.birthState ? '/' + formData.birthState : ''}</div>
                <div><span className="font-medium text-gray-500">Sexo:</span><br />{getGenderLabel(formData.gender)}</div>
                <div><span className="font-medium text-gray-500">Cor/Raça:</span><br />{formData.skinColor || '-'}</div>
                <div><span className="font-medium text-gray-500">Estado Civil:</span><br />{formData.maritalStatus || '-'}</div>
                {formData.responsibleCpf && <div><span className="font-medium text-gray-500">CPF do Responsável:</span><br />{formData.responsibleCpf}</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                2. Documentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-gray-500">CPF:</span><br />{formData.cpf || '-'}</div>
                <div><span className="font-medium text-gray-500">RG:</span><br />{formData.rg || '-'}</div>
                <div><span className="font-medium text-gray-500">Órgão Expedidor:</span><br />{formData.rgIssuer || '-'}</div>
                <div><span className="font-medium text-gray-500">Data Expedição RG:</span><br />{formatDateDisplay(formData.rgIssueDate)}</div>
                <div><span className="font-medium text-gray-500">Passaporte Anterior:</span><br />{formData.previousPassport === 'SIM' ? 'Sim' : formData.previousPassport === 'NAO' ? 'Não' : '-'}</div>
                {formData.previousPassport === 'SIM' && (
                  <>
                    <div><span className="font-medium text-gray-500">Série Passaporte:</span><br />{formData.passportSeries || '-'}</div>
                    <div><span className="font-medium text-gray-500">Número Passaporte:</span><br />{formData.passportNumber || '-'}</div>
                    <div><span className="font-medium text-gray-500">Situação:</span><br />{formData.passportStatus || '-'}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                3. Certidão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-gray-500">Tipo:</span><br />{formData.certificateType || '-'}</div>
                <div><span className="font-medium text-gray-500">Modelo:</span><br />{formData.certificateModel === 'NOVO' ? 'Modelo Novo' : formData.certificateModel === 'ANTIGO' ? 'Modelo Antigo' : '-'}</div>
                {formData.certificateModel === 'NOVO' && (
                  <div className="md:col-span-2"><span className="font-medium text-gray-500">Número Certidão:</span><br />{formData.certificateNumberNew || '-'}</div>
                )}
                {formData.certificateModel === 'ANTIGO' && (
                  <>
                    <div><span className="font-medium text-gray-500">Número:</span><br />{formData.certificateNumberOld || '-'}</div>
                    <div><span className="font-medium text-gray-500">Livro:</span><br />{formData.certificateBook || '-'}</div>
                    <div><span className="font-medium text-gray-500">Folha:</span><br />{formData.certificatePage || '-'}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                4. Contato e Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2"><span className="font-medium text-gray-500">Endereço:</span><br />{formData.address || '-'}</div>
                <div><span className="font-medium text-gray-500">Bairro:</span><br />{formData.neighborhood || '-'}</div>
                <div><span className="font-medium text-gray-500">Cidade:</span><br />{formData.city || '-'}</div>
                <div><span className="font-medium text-gray-500">Estado:</span><br />{formData.state || '-'}</div>
                <div><span className="font-medium text-gray-500">CEP:</span><br />{formData.zipCode || '-'}</div>
                <div><span className="font-medium text-gray-500">Telefone:</span><br />{formData.phone || '-'}</div>
                <div><span className="font-medium text-gray-500">E-mail:</span><br />{formData.email || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                5. Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div><span className="font-medium text-gray-500">Profissão:</span><br />{formData.profession || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {formData.travelAuthorization && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-[#002776] flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  6. Autorização de Viagem (Menor)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div><span className="font-medium text-gray-500">Tipo:</span><br />{formData.travelAuthorization || '-'}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-[#002776] flex items-center gap-2">
                <Settings className="h-5 w-5" />
                7. Detalhes da Emissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div><span className="font-medium text-gray-500">Tipo de Passaporte:</span><br />{formData.passportType || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-6 text-lg"
              onClick={() => setShowReview(false)}
              disabled={submitting}
            >
              ← Voltar e Corrigir
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#009639] hover:bg-[#007a2f] py-6 text-lg"
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#002776] to-[#009639] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">SB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#002776]">SB Viagens e Turismo</h1>
                <p className="text-sm text-gray-500">Formulário para Emissão de Passaporte</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Alert className="mb-6 border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> Este não é um formulário oficial da Polícia Federal. 
            Ele serve apenas para a coleta prévia de dados necessários para efetuarmos o processo de emissão do seu passaporte.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <User className="h-5 w-5" />
                1. Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="previousName">Nome Anterior</Label>
                  <Input
                    id="previousName"
                    value={formData.previousName}
                    onChange={(e) => handleInputChange('previousName', e.target.value)}
                    placeholder="Nome de solteiro ou outro anterior"
                  />
                  <p className="text-xs text-gray-500">Preencha apenas se já teve outro nome registral.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nameChangeReason">Motivo da Alteração do Nome</Label>
                  <Input
                    id="nameChangeReason"
                    value={formData.nameChangeReason}
                    onChange={(e) => handleInputChange('nameChangeReason', e.target.value)}
                    placeholder="Ex: Casamento, decisão judicial"
                    disabled={!formData.previousName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherName">Nome da Mãe *</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Nome do Pai</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birthCity">Naturalidade (Cidade) *</Label>
                  <Input
                    id="birthCity"
                    value={formData.birthCity}
                    onChange={(e) => handleInputChange('birthCity', e.target.value)}
                    placeholder="Ex: SÃO PAULO"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado (Naturalidade) *</Label>
                  <Select value={formData.birthState} onValueChange={(v) => setFormData(prev => ({ ...prev, birthState: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sexo *</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Cor/Raça *</Label>
                  <Select value={formData.skinColor} onValueChange={(v) => setFormData(prev => ({ ...prev, skinColor: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRANCA">Branca</SelectItem>
                      <SelectItem value="PRETA">Preta</SelectItem>
                      <SelectItem value="PARDA">Parda</SelectItem>
                      <SelectItem value="AMARELA">Amarela</SelectItem>
                      <SelectItem value="INDIGENA">Indígena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado Civil *</Label>
                  <Select value={formData.maritalStatus} onValueChange={(v) => setFormData(prev => ({ ...prev, maritalStatus: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
                      <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
                      <SelectItem value="VIÚVO(A)">Viúvo(a)</SelectItem>
                      <SelectItem value="UNIÃO ESTÁVEL">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsibleCpf">CPF do Responsável</Label>
                  <Input
                    id="responsibleCpf"
                    value={formData.responsibleCpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsibleCpf: maskCPF(e.target.value) }))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <p className="text-xs text-gray-500">Apenas se o titular for menor de idade.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <CreditCard className="h-5 w-5" />
                2. Documentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-500">Preenchido automaticamente com seu CPF de login.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rg">RG *</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                    placeholder="Digite sem pontos"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rgIssuer">Órgão Expedidor *</Label>
                  <Input
                    id="rgIssuer"
                    value={formData.rgIssuer}
                    onChange={(e) => handleInputChange('rgIssuer', e.target.value)}
                    placeholder="Ex: SSP/SP"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rgIssueDate">Data de Expedição *</Label>
                  <Input
                    id="rgIssueDate"
                    type="date"
                    value={formData.rgIssueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rgIssueDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Já possui ou já teve passaporte brasileiro anterior? *</Label>
                  <Select value={formData.previousPassport} onValueChange={(v) => setFormData(prev => ({ ...prev, previousPassport: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NAO">Não</SelectItem>
                      <SelectItem value="SIM">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.previousPassport === 'SIM' && (
                  <div className="md:col-span-2 border-t pt-4 mt-2 space-y-4">
                    <p className="font-medium text-[#002776]">Dados do Passaporte Anterior</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="passportSeries">Série do Passaporte Anterior *</Label>
                        <Input
                          id="passportSeries"
                          value={formData.passportSeries}
                          onChange={(e) => handleInputChange('passportSeries', e.target.value)}
                          placeholder="Ex: A ou B"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">Número do Passaporte Anterior *</Label>
                        <Input
                          id="passportNumber"
                          value={formData.passportNumber}
                          onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                          placeholder="Número completo"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label>Situação do Passaporte Anterior *</Label>
                        <Select value={formData.passportStatus} onValueChange={(v) => setFormData(prev => ({ ...prev, passportStatus: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VALIDO">Válido</SelectItem>
                            <SelectItem value="VENCIDO">Vencido</SelectItem>
                            <SelectItem value="EXTRAVIADO">Extraviado</SelectItem>
                            <SelectItem value="ROUBADO">Roubado</SelectItem>
                            <SelectItem value="CANCELADO">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Certidão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <FileCheck className="h-5 w-5" />
                3. Certidão (Nascimento ou Casamento)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Certidão *</Label>
                <RadioGroup
                  value={formData.certificateType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, certificateType: v }))}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NASCIMENTO" id="nascimento" />
                    <Label htmlFor="nascimento" className="cursor-pointer">Nascimento</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASAMENTO" id="casamento" />
                    <Label htmlFor="casamento" className="cursor-pointer">Casamento</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Modelo da Certidão *</Label>
                <Select value={formData.certificateModel} onValueChange={(v) => setFormData(prev => ({ ...prev, certificateModel: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOVO">Modelo Novo (Frente/Verso)</SelectItem>
                    <SelectItem value="ANTIGO">Modelo Antigo (Livro/Folha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.certificateModel === 'NOVO' && (
                <div className="space-y-2">
                  <Label htmlFor="certificateNumberNew">Número da Certidão *</Label>
                  <Input
                    id="certificateNumberNew"
                    value={formData.certificateNumberNew}
                    onChange={(e) => handleInputChange('certificateNumberNew', e.target.value)}
                    placeholder="xxxxxx xx xx xxxx x xxxxx xxx xxxxxxx xx"
                  />
                  <p className="text-xs text-gray-500">Formato: xxxxxx xx xx xxxx x xxxxx xxx xxxxxxx xx (32 dígitos)</p>
                </div>
              )}

              {formData.certificateModel === 'ANTIGO' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="certificateNumberOld">Número da Certidão *</Label>
                    <Input
                      id="certificateNumberOld"
                      value={formData.certificateNumberOld}
                      onChange={(e) => handleInputChange('certificateNumberOld', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificateBook">Número do Livro *</Label>
                    <Input
                      id="certificateBook"
                      value={formData.certificateBook}
                      onChange={(e) => handleInputChange('certificateBook', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificatePage">Folha Número *</Label>
                    <Input
                      id="certificatePage"
                      value={formData.certificatePage}
                      onChange={(e) => handleInputChange('certificatePage', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Contato e Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <MapPin className="h-5 w-5" />
                4. Contato e Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço Completo *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Rua, Número, Complemento"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={formData.state} onValueChange={(v) => setFormData(prev => ({ ...prev, state: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: maskCEP(e.target.value) }))}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Informações Profissionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <Briefcase className="h-5 w-5" />
                5. Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="profession">Profissão *</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Autorização de Viagem para Menor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <Plane className="h-5 w-5" />
                6. Autorização de Viagem (Menor)
              </CardTitle>
              <CardDescription>
                Preencha apenas se o titular for menor de idade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.travelAuthorization}
                onValueChange={(v) => setFormData(prev => ({ ...prev, travelAuthorization: v }))}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="RESTRITA" id="auth1" className="mt-1" />
                  <label htmlFor="auth1" className="cursor-pointer">
                    <span className="font-semibold">Autorização Restrita</span>
                    <p className="text-sm text-gray-500">Viajar apenas com um dos pais indistintamente. (Impresso no passaporte).</p>
                  </label>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="AMPLA" id="auth2" className="mt-1" />
                  <label htmlFor="auth2" className="cursor-pointer">
                    <span className="font-semibold">Autorização Ampla</span>
                    <p className="text-sm text-gray-500">Viajar desacompanhado ou com um dos pais. (Impresso no passaporte).</p>
                  </label>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="POR DOCUMENTO" id="auth3" className="mt-1" />
                  <label htmlFor="auth3" className="cursor-pointer">
                    <span className="font-semibold">Autorização por Documento</span>
                    <p className="text-sm text-gray-500">Dependerá de autorização específica para cada viagem na forma da lei.</p>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Section 7: Detalhes da Emissão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#002776]">
                <Settings className="h-5 w-5" />
                7. Detalhes da Emissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Tipo de Passaporte *</Label>
                <Select value={formData.passportType} onValueChange={(v) => setFormData(prev => ({ ...prev, passportType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMUM">Comum</SelectItem>
                    <SelectItem value="OFICIAL">Oficial</SelectItem>
                    <SelectItem value="DIPLOMATICO">Diplomático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-yellow-300 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>ATENÇÃO:</strong> É imprescindível enviar uma cópia da certidão (nascimento ou casamento), 
              do passaporte anterior (caso possua) e um comprovante de residência para a agência conferir os dados.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            className="w-full bg-[#009639] hover:bg-[#007a2f] py-6 text-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando formulário...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-5 w-5" />
                Enviar Formulário
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
