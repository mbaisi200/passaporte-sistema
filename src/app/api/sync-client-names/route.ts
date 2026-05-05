import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK configuration
const serviceAccount = {
  projectId: "passaporte-2c4b1",
  clientEmail: "firebase-adminsdk-fbsvc@passaporte-2c4b1.iam.gserviceaccount.com",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    if (!serviceAccount.privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
    }
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  }
}

// POST - Sincronizar nomes dos clientes baseado nos formulários enviados
export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin();
    const db = getFirestore();

    const body = await request.json();
    const { adminKey } = body;

    // Simple security check
    if (adminKey !== 'sync-client-names-2024') {
      return NextResponse.json(
        { error: 'Chave de administrador inválida' },
        { status: 401 }
      );
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyUpdatedCount = 0;

    // Buscar todos os formulários
    const formulariosSnapshot = await db.collection('formularios').get();
    
    for (const formDoc of formulariosSnapshot.docs) {
      const formData = formDoc.data();
      const cpf = formData.cpf;
      const fullName = formData.dados?.fullName;

      // Se o formulário tem nome e CPF
      if (cpf && fullName) {
        const cleanCpf = cpf.replace(/\D/g, '');
        
        // Buscar cliente
        const clienteDoc = await db.collection('clientes').doc(cleanCpf).get();

        if (clienteDoc.exists) {
          const clienteData = clienteDoc.data();
          
          // Se o nome já está atualizado, pular
          if (clienteData?.nome === fullName) {
            alreadyUpdatedCount++;
            continue;
          }

          // Atualizar nome do cliente
          await db.collection('clientes').doc(cleanCpf).update({
            nome: fullName,
            email: formData.dados?.email || clienteData?.email || null,
            telefone: formData.dados?.phone || clienteData?.telefone || null
          });
          updatedCount++;
        } else {
          notFoundCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída',
      resumo: {
        atualizados: updatedCount,
        jaAtualizados: alreadyUpdatedCount,
        clientesNaoEncontrados: notFoundCount,
        totalFormularios: formulariosSnapshot.size
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar nomes:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar nomes dos clientes' },
      { status: 500 }
    );
  }
}
