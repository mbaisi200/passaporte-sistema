import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// DEFAULT PASSWORD for migrated clients
const DEFAULT_PASSWORD = '123456';

// POST - Migrate CPFs from Firebase Authentication to Firestore 'clientes' collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey, authUsers } = body;

    // Simple admin key check
    if (adminKey !== 'migrate-cpfs-2024') {
      return NextResponse.json(
        { error: 'Chave de administração inválida' },
        { status: 401 }
      );
    }

    // authUsers should be an array of users from Firebase Auth (passed from client)
    if (!authUsers || !Array.isArray(authUsers)) {
      return NextResponse.json(
        { error: 'Lista de usuários não fornecida. Execute a migração pela página de admin.' },
        { status: 400 }
      );
    }

    let clientesMigrados = 0;
    let clientesIgnorados = 0;
    let adminIgnorados = 0;

    // Process each user
    for (const authUser of authUsers) {
      const uid = authUser.uid;
      const email = authUser.email || '';

      // Skip admin users (email-based, not CPF format)
      if (email.includes('@') && !email.match(/^\d{11}@passaporte/)) {
        adminIgnorados++;
        continue;
      }

      // Extract CPF from email (format was: CPF@passaporte.com)
      // Or use uid if it's a CPF format
      let cpf = '';
      
      if (email.match(/^\d{11}@passaporte/)) {
        // Email format: 12345678901@passaporte.com
        cpf = email.split('@')[0];
      } else if (uid && /^\d{11}$/.test(uid)) {
        // UID is the CPF
        cpf = uid;
      } else if (email && /^\d{11}$/.test(email.split('@')[0])) {
        // Fallback: extract from email
        cpf = email.split('@')[0];
      } else {
        // Not a CPF-based user
        clientesIgnorados++;
        continue;
      }

      // Validate CPF format (11 digits)
      if (!/^\d{11}$/.test(cpf)) {
        clientesIgnorados++;
        continue;
      }

      // Check if cliente already exists in Firestore 'clientes'
      const clienteDoc = await getDoc(doc(db, 'clientes', cpf));
      
      if (clienteDoc.exists()) {
        clientesIgnorados++;
        continue;
      }

      // Create cliente in Firestore 'clientes' collection
      await setDoc(doc(db, 'clientes', cpf), {
        cpf: cpf,
        nome: authUser.displayName || null,
        email: null,
        senha: DEFAULT_PASSWORD,
        blocked: false,
        addedBy: 'migration',
        addedAt: serverTimestamp(),
        migratedFrom: 'firebase-auth',
        originalUid: uid
      });

      clientesMigrados++;
    }

    return NextResponse.json({
      success: true,
      message: 'Migração concluída com sucesso!',
      resumo: {
        clientesMigrados,
        clientesIgnorados,
        adminIgnorados
      }
    });

  } catch (error) {
    console.error('Erro na migração:', error);
    return NextResponse.json(
      { error: 'Erro ao realizar migração: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
