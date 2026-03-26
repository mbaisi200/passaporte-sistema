import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Buscar formulário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const formularioDoc = await getDoc(doc(db, 'formularios', id));

    if (!formularioDoc.exists()) {
      return NextResponse.json(
        { error: 'Formulário não encontrado' },
        { status: 404 }
      );
    }

    const data = formularioDoc.data();

    // Get cliente info if CPF exists
    let cliente = null;
    if (data.cpf) {
      const clienteDoc = await getDoc(doc(db, 'clientes', data.cpf));
      if (clienteDoc.exists()) {
        const clienteData = clienteDoc.data();
        cliente = {
          id: clienteDoc.id,
          cpf: clienteData.cpf,
          nome: clienteData.nome,
          email: clienteData.email,
          telefone: clienteData.telefone
        };
      }
    }

    return NextResponse.json({
      formulario: {
        id: formularioDoc.id,
        ...data,
        cliente
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
      dados?: object;
      updatedAt?: ReturnType<typeof serverTimestamp>;
    } = { updatedAt: serverTimestamp() };

    if (status) updateData.status = status;
    if (dados) updateData.dados = dados;

    await updateDoc(doc(db, 'formularios', id), updateData);

    return NextResponse.json({
      success: true,
      formulario: { id, ...updateData, dados: dados }
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

    await deleteDoc(doc(db, 'formularios', id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao remover formulário' },
      { status: 500 }
    );
  }
}
