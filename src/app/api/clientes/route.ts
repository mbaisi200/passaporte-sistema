import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';

// GET - Listar todos os clientes
export async function GET() {
  try {
    const clientes = await db.cliente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        formularios: {
          where: { status: 'pendente' },
          take: 1,
          select: { id: true, dados: true }
        }
      }
    });

    // Parse dos dados do formulário para obter nomes
    const clientesComNome = clientes.map(cliente => {
      let nome = cliente.nome;
      if (!nome && cliente.formularios.length > 0) {
        try {
          const dados = JSON.parse(cliente.formularios[0].dados);
          nome = dados.fullName || null;
        } catch {
          // ignore parse errors
        }
      }
      return {
        id: cliente.id,
        cpf: cliente.cpf,
        nome: nome,
        email: cliente.email,
        telefone: cliente.telefone,
        blocked: cliente.blocked,
        createdAt: cliente.createdAt,
        hasForm: cliente.formularios.length > 0
      };
    });

    return NextResponse.json({ clientes: clientesComNome });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

// POST - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf, senha, addedBy } = body;

    // Validar CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const existente = await db.cliente.findUnique({
      where: { cpf: cleanCpf }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Este CPF já está cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha padrão
    const senhaHash = await hash(senha || '123456', 10);

    // Criar cliente
    const cliente = await db.cliente.create({
      data: {
        cpf: cleanCpf,
        senha: senhaHash,
        addedBy: addedBy || null,
      }
    });

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        cpf: cliente.cpf,
        createdAt: cliente.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}
