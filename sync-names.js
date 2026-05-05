import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_ACCOUNT_PATH = join(__dirname, 'service-account.json');

async function syncClientNames() {
  // Verificar se o arquivo de credenciais existe
  try {
    readFileSync(SERVICE_ACCOUNT_PATH);
  } catch (e) {
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
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

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
  let createdCount = 0;

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
        // Cliente não existe - criar novo registro com dados do formulário
        await db.collection('clientes').doc(cleanCpf).set({
          cpf: cleanCpf,
          nome: fullName,
          email: formData.dados?.email || null,
          telefone: formData.dados?.phone || null,
          senha: '123456',
          blocked: false,
          addedBy: 'sync-script',
          addedAt: new Date()
        });
        createdCount++;
        console.log(`➕ ${cleanCpf} - cliente criado com nome: ${fullName}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO DA SINCRONIZAÇÃO:');
    console.log(`   ✅ Nomes atualizados: ${updatedCount}`);
    console.log(`   ➕ Clientes criados: ${createdCount}`);
    console.log(`   ⏭️  Já estavam atualizados: ${alreadyUpdatedCount}`);
    console.log(`   ⚠️  Clientes não encontrados: ${notFoundCount}`);
    console.log(`   ❓ Formulários sem nome: ${noNameCount}`);
    console.log(`   📋 Total de formulários: ${formulariosSnapshot.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Sincronização concluída!');

  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
    process.exit(1);
  }
}

syncClientNames();
