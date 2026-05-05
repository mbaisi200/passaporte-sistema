import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Caminho para o arquivo de credenciais (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

async function syncClientNames() {
  // Verificar se o arquivo de credenciais existe
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Arquivo service-account.json não encontrado!');
    console.log('\n📝 Para baixar o arquivo:');
    console.log('   1. Acesse https://console.firebase.google.com/');
    console.log('   2. Selecione o projeto: passaporte-2c4b1');
    console.log('   3. Vá em Configurações do Projeto (engrenagem) → Contas de Serviço');
    console.log('   4. Na linha "Firebase Admin SDK", clique em "Gerar nova chave privada"');
    console.log('   5. Salve o arquivo JSON como "service-account.json" na raiz do projeto\n');
    process.exit(1);
  }

  // Inicializar Firebase Admin
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  const db = getFirestore();

  console.log('🔄 Iniciando sincronização de nomes dos clientes...\n');

  let updatedCount = 0;
  let alreadyUpdatedCount = 0;
  let notFoundCount = 0;
  let noNameCount = 0;

  try {
    // Buscar todos os formulários
    const formulariosSnapshot = await db.collection('formularios').get();
    
    console.log(`📋 Encontrados ${formulariosSnapshot.size} formulários\n`);

    for (const formDoc of formulariosSnapshot.docs) {
      const formData = formDoc.data();
      const cpf = formData.cpf;
      const fullName = formData.dados?.fullName;

      if (!cpf) {
        continue;
      }

      const cleanCpf = cpf.replace(/\D/g, '');

      if (!fullName) {
        noNameCount++;
        continue;
      }

      // Buscar cliente
      const clienteDoc = await db.collection('clientes').doc(cleanCpf).get();

      if (clienteDoc.exists) {
        const clienteData = clienteDoc.data();

        if (clienteData?.nome === fullName) {
          alreadyUpdatedCount++;
          console.log(`⏭️  ${cleanCpf} - já atualizado`);
        } else {
          // Atualizar nome do cliente
          await db.collection('clientes').doc(cleanCpf).update({
            nome: fullName,
            email: formData.dados?.email || clienteData?.email || null,
            telefone: formData.dados?.phone || clienteData?.telefone || null
          });
          updatedCount++;
          console.log(`✅ ${cleanCpf} - nome atualizado para: ${fullName}`);
        }
      } else {
        notFoundCount++;
        console.log(`⚠️  ${cleanCpf} - cliente não encontrado na coleção 'clientes'`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO DA SINCRONIZAÇÃO:');
    console.log(`   ✅ Nomes atualizados: ${updatedCount}`);
    console.log(`   ⏭️  Já estavam atualizados: ${alreadyUpdatedCount}`);
    console.log(`   ⚠️  Clientes não encontrados: ${notFoundCount}`);
    console.log(`   ❓ Formulários sem nome: ${noNameCount}`);
    console.log(`   📋 Total de formulários: ${formulariosSnapshot.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
    process.exit(1);
  }
}

syncClientNames()
  .then(() => {
    console.log('✅ Sincronização concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
