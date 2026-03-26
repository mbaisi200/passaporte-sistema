import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Get dashboard stats
export async function GET() {
  try {
    // Get all clientes from Firestore
    const clientesSnapshot = await getDocs(collection(db, 'clientes'));
    const clientes = clientesSnapshot.docs.map(doc => doc.data());
    
    const totalClientes = clientes.length;
    const clientesAtivos = clientes.filter(c => !c.blocked).length;
    const clientesBloqueados = clientes.filter(c => c.blocked).length;

    // Get all formularios from Firestore
    const formulariosSnapshot = await getDocs(collection(db, 'formularios'));
    const formularios = formulariosSnapshot.docs.map(doc => doc.data());
    
    const totalFormularios = formularios.length;
    const formulariosPendentes = formularios.filter(f => f.status === 'pendente').length;
    const formulariosProcessados = formularios.filter(f => f.status === 'processado').length;

    // Get recent items (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const clientesRecentes = clientes.filter(c => {
      const addedAt = c.addedAt as Timestamp;
      return addedAt && addedAt.toDate() >= sevenDaysAgo;
    }).length;

    const formulariosRecentes = formularios.filter(f => {
      const createdAt = f.createdAt as Timestamp;
      return createdAt && createdAt.toDate() >= sevenDaysAgo;
    }).length;

    return NextResponse.json({
      totalClientes,
      clientesAtivos,
      clientesBloqueados,
      totalFormularios,
      formulariosPendentes,
      formulariosProcessados,
      clientesRecentes,
      formulariosRecentes
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
