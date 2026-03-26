import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Buscar formulário por CPF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params;
    const cleanCpf = cpf.replace(/\D/g, '');

    const formulario = await db.formulario.findFirst({
      where: { cpf: cleanCpf },
      orderBy: { createdAt: 'desc' }
    });

    if (!formulario) {
      return NextResponse.json({ formulario: null });
    }

    return NextResponse.json({
      formulario: {
        ...formulario,
        dados: JSON.parse(formulario.dados)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar formulário por CPF:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar formulário' },
      { status: 500 }
    );
  }
}
