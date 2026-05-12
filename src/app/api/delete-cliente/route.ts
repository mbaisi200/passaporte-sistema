import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function DELETE(request: NextRequest) {
  try {
    const { cpf } = await request.json();

    if (!cpf || !/^\d{11}$/.test(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    const results: { auth?: string; firestore?: string; formularios?: string } = {};

    // 1. Delete from Firebase Auth (optional - only if FIREBASE_PRIVATE_KEY is configured)
    if (process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const { initializeApp, cert, getApps } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');

        if (getApps().length === 0) {
          initializeApp({
            credential: cert({
              projectId: "passaporte-2c4b1",
              clientEmail: "firebase-adminsdk-fbsvc@passaporte-2c4b1.iam.gserviceaccount.com",
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            } as any),
          });
        }

        const auth = getAuth();
        try {
          const userRecord = await auth.getUserByEmail(`${cpf}@passaporte.com`);
          await auth.deleteUser(userRecord.uid);
          results.auth = 'deleted';
        } catch (err: unknown) {
          if (err instanceof Error && 'code' in err && (err as any).code === 'auth/user-not-found') {
            results.auth = 'not-found';
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error('Erro ao deletar do Auth:', err);
        results.auth = 'error';
      }
    } else {
      results.auth = 'skipped (no FIREBASE_PRIVATE_KEY)';
    }

    // 2. Delete all formularios associated with this CPF
    const formsQuery = query(collection(db, 'formularios'), where('cpf', '==', cpf));
    const formulariosSnapshot = await getDocs(formsQuery);

    let deletedForms = 0;
    if (formulariosSnapshot.size > 0) {
      const batch = writeBatch(db);
      formulariosSnapshot.docs.forEach((docSnap) => {
        batch.delete(doc(db, 'formularios', docSnap.id));
        deletedForms++;
      });
      await batch.commit();
    }
    results.formularios = `${deletedForms} deleted`;

    // 3. Delete from clientes collection
    await deleteDoc(doc(db, 'clientes', cpf));
    results.firestore = 'deleted';

    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso!',
      results,
    });
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao remover cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
