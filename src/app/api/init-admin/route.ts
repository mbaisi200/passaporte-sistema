import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK configuration
// Note: In production, you should use environment variables for the private key
const serviceAccount = {
  projectId: "passaporte-2c4b1",
  clientEmail: "firebase-adminsdk-fbsvc@passaporte-2c4b1.iam.gserviceaccount.com",
  // The private key should be stored in environment variables
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    if (!serviceAccount.privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
    }
    initializeApp({
      credential: cert(serviceAccount as cert),
    });
  }
}

export async function GET() {
  try {
    initFirebaseAdmin();
    
    const auth = getAuth();
    const db = getFirestore();
    
    const adminEmail = 'admin@passaporte.com';
    const adminPassword = 'Admin@123';
    
    // Check if admin user already exists
    try {
      const existingUser = await auth.getUserByEmail(adminEmail);
      
      // Update user document in Firestore
      await db.collection('users').doc(existingUser.uid).set({
        uid: existingUser.uid,
        email: adminEmail,
        cpf: '00000000000',
        role: 'admin',
        createdAt: new Date()
      }, { merge: true });
      
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        uid: existingUser.uid,
        email: adminEmail
      });
    } catch {
      // User doesn't exist, create new one
      const userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: true,
      });
      
      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: adminEmail,
        cpf: '00000000000',
        role: 'admin',
        createdAt: new Date()
      });
      
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        uid: userRecord.uid,
        email: adminEmail,
        password: adminPassword
      });
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
