'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  FileText, 
  UserPlus, 
  LogOut,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminDashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCpfs: 0,
    activeAccounts: 0,
    totalForms: 0,
    pendingForms: 0
  });
  const [periodFilter, setPeriodFilter] = useState('todos');

  useEffect(() => {
    if (!loading && (!user || userData?.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  const filterByPeriod = (data: Record<string, unknown>[], dateField: string) => {
    if (periodFilter === 'todos') return data;
    
    const now = new Date();
    let startDate: Date;
    
    switch (periodFilter) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'semana':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'trimestre':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'ano':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return data;
    }
    
    return data.filter((item) => {
      const timestamp = item[dateField] as { seconds: number } | null;
      if (!timestamp) return false;
      const itemDate = new Date(timestamp.seconds * 1000);
      return itemDate >= startDate;
    });
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (userData?.role === 'admin') {
        // Fetch CPFs stats
        const cpfsSnapshot = await getDocs(collection(db, 'authorized_cpfs'));
        const cpfsData = cpfsSnapshot.docs.map(doc => doc.data());
        
        // Fetch forms stats
        const formsSnapshot = await getDocs(collection(db, 'formularios'));
        const formsData = formsSnapshot.docs.map(doc => doc.data());
        
        // Apply period filter
        const filteredCpfs = filterByPeriod(cpfsData, 'addedAt');
        const filteredForms = filterByPeriod(formsData, 'createdAt');
        
        setStats({
          totalCpfs: filteredCpfs.length,
          activeAccounts: filteredCpfs.filter(c => c.hasAccount).length,
          totalForms: filteredForms.length,
          pendingForms: filteredForms.filter(f => f.status === 'pendente').length
        });
      }
    };

    fetchStats();
  }, [userData, periodFilter]);

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
              Gerenciar CPFs
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-[#623AA2]">Visão Geral</h2>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Última Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="trimestre">Último Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CPFs Autorizados
              </CardTitle>
              <Users className="h-5 w-5 text-[#623AA2]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#623AA2]">{stats.totalCpfs}</div>
              <p className="text-xs text-gray-500 mt-1">Total de CPFs no sistema</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Contas Ativas
              </CardTitle>
              <UserPlus className="h-5 w-5 text-[#F97794]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#F97794]">{stats.activeAccounts}</div>
              <p className="text-xs text-gray-500 mt-1">Usuários registrados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Formulários Enviados
              </CardTitle>
              <FileText className="h-5 w-5 text-[#623AA2]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#623AA2]">{stats.totalForms}</div>
              <p className="text-xs text-gray-500 mt-1">Total de formulários</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.pendingForms}</div>
              <p className="text-xs text-gray-500 mt-1">Aguardando processamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[#623AA2] mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/admin/cpfs')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#623AA2] to-[#F97794] rounded-full flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#623AA2]">Adicionar Novo CPF</h4>
                  <p className="text-sm text-gray-500">Autorize um novo cliente</p>
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
          </div>
        </div>
      </main>
    </div>
  );
}
