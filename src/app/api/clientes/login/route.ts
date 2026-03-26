import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';

// POST - Login de cliente por CPF
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf, senha } = body;

    // Validar CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Buscar cliente
    const cliente = await db.cliente.findUnique({
      where: { cpf: cleanCpf }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'CPF não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se está bloqueado
    if (cliente.blocked) {
      return NextResponse.json(
        { error: 'Acesso bloqueado. Entre em contato com a administração.' },
        { status: 403 }
      );
    }

    // Verificar senha
    const senhaValida = await compare(senha, cliente.senha);
    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Retornar dados do cliente (sem a senha)
    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        cpf: cliente.cpf,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
