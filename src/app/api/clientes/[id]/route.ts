import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cliente = await db.cliente.findUnique({
      where: { id },
      include: {
        formularios: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cliente });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, email, telefone, blocked, senha } = body;

    const updateData: {
      nome?: string | null;
      email?: string | null;
      telefone?: string | null;
      blocked?: boolean;
      senha?: string;
    } = {};

    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (telefone !== undefined) updateData.telefone = telefone;
    if (blocked !== undefined) updateData.blocked = blocked;
    if (senha) updateData.senha = await hash(senha, 10);

    const cliente = await db.cliente.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        cpf: cliente.cpf,
        nome: cliente.nome,
        email: cliente.email,
        blocked: cliente.blocked
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    );
  }
}

// DELETE - Remover cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se existe
    const cliente = await db.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Remover formulários associados primeiro
    await db.formulario.deleteMany({
      where: { clienteId: id }
    });

    // Remover cliente
    await db.cliente.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao remover cliente' },
      { status: 500 }
    );
  }
}
