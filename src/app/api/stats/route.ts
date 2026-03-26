import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get dashboard stats
export async function GET() {
  try {
    // Get total clientes
    const totalClientes = await db.cliente.count();
    
    // Get active clientes (not blocked)
    const clientesAtivos = await db.cliente.count({
      where: { blocked: false }
    });
    
    // Get total formularios
    const totalFormularios = await db.formulario.count();
    
    // Get pending formularios
    const formulariosPendentes = await db.formulario.count({
      where: { status: 'pendente' }
    });
    
    // Get processed formularios
    const formulariosProcessados = await db.formulario.count({
      where: { status: 'processado' }
    });

    // Get recent clientes (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const clientesRecentes = await db.cliente.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    // Get recent formularios (last 7 days)
    const formulariosRecentes = await db.formulario.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    return NextResponse.json({
      totalClientes,
      clientesAtivos,
      clientesBloqueados: totalClientes - clientesAtivos,
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
