import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar todos os formulários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cpf = searchParams.get('cpf');

    const where: {
      status?: string;
      cpf?: string;
    } = {};

    if (status) where.status = status;
    if (cpf) where.cpf = cpf;

    const formularios = await db.formulario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: {
          select: { id: true, cpf: true, nome: true, email: true }
        }
      }
    });

    // Parse dos dados JSON
    const formulariosParsed = formularios.map(form => ({
      ...form,
      dados: JSON.parse(form.dados)
    }));

    return NextResponse.json({ formularios: formulariosParsed });
  } catch (error) {
    console.error('Erro ao buscar formulários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar formulários' },
      { status: 500 }
    );
  }
}

// POST - Criar novo formulário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clienteId, cpf, dados } = body;

    // Verificar se já existe formulário pendente para este CPF
    const existente = await db.formulario.findFirst({
      where: { cpf, status: 'pendente' }
    });

    if (existente) {
      // Atualizar existente
      const atualizado = await db.formulario.update({
        where: { id: existente.id },
        data: {
          dados: JSON.stringify(dados),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        formulario: { ...atualizado, dados }
      });
    }

    // Criar novo
    const formulario = await db.formulario.create({
      data: {
        clienteId: clienteId || null,
        cpf,
        dados: JSON.stringify(dados),
        status: 'pendente'
      }
    });

    // Atualizar nome do cliente se disponível
    if (clienteId && dados.fullName) {
      await db.cliente.update({
        where: { id: clienteId },
        data: { nome: dados.fullName, email: dados.email, telefone: dados.phone }
      });
    }

    return NextResponse.json({
      success: true,
      formulario: { ...formulario, dados }
    });
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar formulário' },
      { status: 500 }
    );
  }
}
