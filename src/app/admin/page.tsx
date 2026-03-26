'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  UserPlus, 
  LogOut,
  BarChart3,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  Database
} from 'lucide-react';

interface Stats {
  totalClientes: number;
  clientesAtivos: number;
  clientesBloqueados: number;
  totalFormularios: number;
  formulariosPendentes: number;
  formulariosProcessados: number;
  clientesRecentes: number;
  formulariosRecentes: number;
}

export default function AdminDashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0,
    clientesAtivos: 0,
    clientesBloqueados: 0,
    totalFormularios: 0,
    formulariosPendentes: 0,
    formulariosProcessados: 0,
    clientesRecentes: 0,
    formulariosRecentes: 0
  });

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (userData?.role === 'admin') {
        try {
          const response = await fetch('/api/stats');
          const data = await response.json();
          setStats(data);
        } catch (error) {
          console.error('Erro ao buscar estatísticas:', error);
        }
      }
    };

    fetchStats();
  }, [userData]);

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
                <h1 className="text-xl font-bold">Painel Administrativo</h1>
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
              className="border-b-2 border-[#F97794] text-[#623AA2]"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/cpfs')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Gerenciar Clientes
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-[#623AA2]"
              onClick={() => router.push('/admin/formularios')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Formulários
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-[#623AA2] mb-6">Visão Geral</h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Clientes
              </CardTitle>
              <Users className="h-5 w-5 text-[#623AA2]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#623AA2]">{stats.totalClientes}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.clientesRecentes} novos na última semana</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Clientes Ativos
              </CardTitle>
              <UserCheck className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.clientesAtivos}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.clientesBloqueados} bloqueados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Formulários Enviados
              </CardTitle>
              <FileText className="h-5 w-5 text-[#F97794]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#F97794]">{stats.totalFormularios}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.formulariosRecentes} na última semana</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
              <Clock className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.formulariosPendentes}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.formulariosProcessados} processados</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg font-semibold text-[#623AA2] mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/admin/cpfs')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-gradient-to-r from-[#623AA2] to-[#F97794] rounded-full flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-[#623AA2]">Adicionar Novo Cliente</h4>
                <p className="text-sm text-gray-500">Cadastre um novo cliente pelo CPF</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/admin/formularios')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-[#623AA2] rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-[#623AA2]">Ver Formulários</h4>
                <p className="text-sm text-gray-500">Consulte formulários enviados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/admin/migrar')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-[#623AA2]">Migrar Dados</h4>
                <p className="text-sm text-gray-500">Transferir CPFs do Firestore</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
