import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Buscar formulário por CPF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params;
    const cleanCpf = cpf.replace(/\D/g, '');

    // Query formularios by CPF, ordered by createdAt desc
    const q = query(
      collection(db, 'formularios'),
      where('cpf', '==', cleanCpf),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const formulariosSnapshot = await getDocs(q);

    if (formulariosSnapshot.empty) {
      return NextResponse.json({ formulario: null });
    }

    const doc = formulariosSnapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({
      formulario: {
        id: doc.id,
        ...data
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
