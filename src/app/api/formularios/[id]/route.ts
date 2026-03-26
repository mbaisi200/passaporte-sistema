import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Buscar formulário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const formulario = await db.formulario.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, cpf: true, nome: true, email: true, telefone: true }
        }
      }
    });

    if (!formulario) {
      return NextResponse.json(
        { error: 'Formulário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      formulario: {
        ...formulario,
        dados: JSON.parse(formulario.dados)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar formulário' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar formulário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, dados } = body;

    const updateData: {
      status?: string;
      dados?: string;
    } = {};

    if (status) updateData.status = status;
    if (dados) updateData.dados = JSON.stringify(dados);

    const formulario = await db.formulario.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      formulario: { ...formulario, dados: dados ? dados : JSON.parse(formulario.dados) }
    });
  } catch (error) {
    console.error('Erro ao atualizar formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar formulário' },
      { status: 500 }
    );
  }
}

// DELETE - Remover formulário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.formulario.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao remover formulário' },
      { status: 500 }
    );
  }
}
