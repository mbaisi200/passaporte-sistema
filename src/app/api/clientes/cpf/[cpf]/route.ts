import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Buscar cliente por CPF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params;
    const cleanCpf = cpf.replace(/\D/g, '');

    const cliente = await db.cliente.findUnique({
      where: { cpf: cleanCpf },
      include: {
        formularios: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        cpf: cliente.cpf,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        blocked: cliente.blocked,
        formulario: cliente.formularios[0] || null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar cliente por CPF:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}
