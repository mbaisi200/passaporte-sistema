import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Listar todos os formulários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cpf = searchParams.get('cpf');

    // Build query
    let q = query(collection(db, 'formularios'));
    
    const formulariosSnapshot = await getDocs(q);
    let formularios = formulariosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by status if provided
    if (status) {
      formularios = formularios.filter(f => f.status === status);
    }

    // Filter by CPF if provided
    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      formularios = formularios.filter(f => f.cpf === cleanCpf);
    }

    // Sort by createdAt desc
    formularios.sort((a, b) => {
      const dateA = (a.createdAt as Timestamp)?.toDate?.() || new Date(0);
      const dateB = (b.createdAt as Timestamp)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // Get cliente info for each formulario
    const formulariosWithCliente = await Promise.all(
      formularios.map(async (form) => {
        if (form.cpf) {
          const clienteDoc = await getDoc(doc(db, 'clientes', form.cpf));
          if (clienteDoc.exists()) {
            const clienteData = clienteDoc.data();
            return {
              ...form,
              cliente: {
                id: clienteDoc.id,
                cpf: clienteData.cpf,
                nome: clienteData.nome,
                email: clienteData.email
              }
            };
          }
        }
        return { ...form, cliente: null };
      })
    );

    return NextResponse.json({ formularios: formulariosWithCliente });
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
    const { cpf, dados } = body;

    const cleanCpf = cpf?.replace(/\D/g, '');

    if (!cleanCpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe formulário pendente para este CPF
    const q = query(
      collection(db, 'formularios'),
      where('cpf', '==', cleanCpf),
      where('status', '==', 'pendente')
    );
    
    const existenteSnapshot = await getDocs(q);
    
    if (!existenteSnapshot.empty) {
      // Atualizar existente
      const existingDoc = existenteSnapshot.docs[0];
      await updateDoc(doc(db, 'formularios', existingDoc.id), {
        dados: dados,
        updatedAt: serverTimestamp()
      });

      return NextResponse.json({
        success: true,
        formulario: {
          id: existingDoc.id,
          ...existingDoc.data(),
          dados
        }
      });
    }

    // Criar novo
    const newFormulario = {
      cpf: cleanCpf,
      dados: dados,
      status: 'pendente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'formularios'), newFormulario);

    // Atualizar nome do cliente se disponível
    if (dados.fullName) {
      const clienteRef = doc(db, 'clientes', cleanCpf);
      const clienteDoc = await getDoc(clienteRef);
      
      if (clienteDoc.exists()) {
        await updateDoc(clienteRef, {
          nome: dados.fullName,
          email: dados.email || null,
          telefone: dados.phone || null
        });
      }
    }

    return NextResponse.json({
      success: true,
      formulario: {
        id: docRef.id,
        ...newFormulario,
        dados
      }
    });
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar formulário' },
      { status: 500 }
    );
  }
}
