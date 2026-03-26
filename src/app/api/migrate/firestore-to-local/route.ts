import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';

// POST - Migrate CPFs from Firestore to local database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey } = body;

    // Simple admin key check (you should use proper authentication)
    if (adminKey !== 'migrate-cpfs-2024') {
      return NextResponse.json(
        { error: 'Chave de administração inválida' },
        { status: 401 }
      );
    }

    // Get all authorized_cpfs from Firestore
    const cpfsSnapshot = await getDocs(collection(firestore, 'authorized_cpfs'));
    const cpfsData = cpfsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all formularios from Firestore
    const formulariosSnapshot = await getDocs(collection(firestore, 'formularios'));
    const formulariosData = formulariosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const DEFAULT_PASSWORD = '123456';
    const senhaHash = await hash(DEFAULT_PASSWORD, 10);

    let clientesMigrados = 0;
    let clientesIgnorados = 0;
    let formulariosMigrados = 0;
    let formulariosIgnorados = 0;

    // Migrate CPFs (only those that look like CPF - 11 digits)
    for (const cpfDoc of cpfsData) {
      const cpf = cpfDoc.id;
      
      // Check if it's a valid CPF format (11 digits)
      if (!/^\d{11}$/.test(cpf)) {
        clientesIgnorados++;
        continue;
      }

      // Check if already exists
      const existente = await db.cliente.findUnique({
        where: { cpf }
      });

      if (existente) {
        clientesIgnorados++;
        continue;
      }

      // Create cliente
      await db.cliente.create({
        data: {
          cpf,
          senha: senhaHash,
          blocked: cpfDoc.blocked || false,
          addedBy: cpfDoc.addedBy || null,
          createdAt: cpfDoc.addedAt?.seconds 
            ? new Date(cpfDoc.addedAt.seconds * 1000) 
            : new Date(),
        }
      });

      clientesMigrados++;
    }

    // Migrate formularios
    for (const formDoc of formulariosData) {
      const cpf = formDoc.cpf;

      if (!cpf) {
        formulariosIgnorados++;
        continue;
      }

      // Find cliente by CPF
      const cliente = await db.cliente.findUnique({
        where: { cpf }
      });

      // Check if formulario already exists
      const existente = await db.formulario.findFirst({
        where: { 
          cpf,
          createdAt: formDoc.createdAt?.seconds 
            ? new Date(formDoc.createdAt.seconds * 1000) 
            : new Date()
        }
      });

      if (existente) {
        formulariosIgnorados++;
        continue;
      }

      // Create formulario
      await db.formulario.create({
        data: {
          clienteId: cliente?.id || null,
          cpf,
          dados: JSON.stringify(formDoc.dados || {}),
          status: formDoc.status || 'pendente',
          createdAt: formDoc.createdAt?.seconds 
            ? new Date(formDoc.createdAt.seconds * 1000) 
            : new Date(),
        }
      });

      formulariosMigrados++;

      // Update cliente name if available
      if (cliente && formDoc.dados?.fullName) {
        await db.cliente.update({
          where: { id: cliente.id },
          data: { 
            nome: formDoc.dados.fullName,
            email: formDoc.dados.email || null,
            telefone: formDoc.dados.phone || null
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migração concluída com sucesso!',
      resumo: {
        clientesMigrados,
        clientesIgnorados,
        formulariosMigrados,
        formulariosIgnorados
      }
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return NextResponse.json(
      { error: 'Erro ao realizar migração' },
      { status: 500 }
    );
  }
}
