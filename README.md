# Sistema de Emissão de Passaporte Brasileiro

Sistema completo para coleta de dados para emissão de passaporte brasileiro, com autenticação via Firebase e painel administrativo.

## 🚀 Funcionalidades

### Para Usuários
- **Primeiro Acesso**: Cadastro com CPF autorizado
- **Login**: Acesso ao sistema com email e senha
- **Formulário de Passaporte**: Preenchimento completo com todos os dados necessários
- **Geração de TXT**: Download automático do arquivo com os dados formatados

### Para Administradores
- **Dashboard**: Visão geral com estatísticas
- **Gerenciar CPFs**: Adicionar/remover CPFs autorizados
- **Visualizar Formulários**: Acompanhar formulários enviados
- **Status**: Atualizar status dos formulários (pendente/processado)

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Firebase** - Autenticação e Banco de Dados
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Firebase

## 🔧 Configuração

1. Clone o repositório:
```bash
git clone https://github.com/mbaisi200/passaporte-sistema.git
cd passaporte-sistema
```

2. Instale as dependências:
```bash
bun install
```

3. Configure as variáveis de ambiente (se necessário para Firebase Admin):
```bash
FIREBASE_PRIVATE_KEY="sua-chave-privada"
```

4. Execute o projeto:
```bash
bun run dev
```

## 🔐 Acesso ao Sistema

### Admin
- **Email**: admin@passaporte.com
- **Senha**: Admin@123

### Usuários
1. O administrador deve cadastrar o CPF no painel admin
2. O usuário acessa a página de registro
3. Informa CPF autorizado + email + senha
4. Após cadastro, pode acessar o formulário

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Página de login
│   ├── register/page.tsx     # Página de cadastro
│   ├── formulario/page.tsx   # Formulário de passaporte
│   ├── admin/
│   │   ├── page.tsx          # Dashboard admin
│   │   ├── cpfs/page.tsx     # Gerenciar CPFs
│   │   └── formularios/page.tsx # Ver formulários
│   └── api/
│       └── init-admin/route.ts # API para criar admin
├── contexts/
│   └── AuthContext.tsx       # Contexto de autenticação
└── lib/
    ├── firebase.ts           # Configuração Firebase
    └── utils.ts              # Utilitários
```

## 🗄️ Estrutura do Firestore

### Coleção: `users`
```typescript
{
  uid: string;
  email: string;
  cpf: string;
  role: 'admin' | 'user';
  createdAt: Timestamp;
}
```

### Coleção: `authorized_cpfs`
```typescript
{
  cpf: string; // ID do documento (sem formatação)
  addedBy: string;
  addedAt: Timestamp;
  hasAccount: boolean;
  email: string;
  userId: string;
}
```

### Coleção: `formularios`
```typescript
{
  userId: string;
  cpf: string;
  dados: object; // Dados do formulário
  createdAt: Timestamp;
  status: 'pendente' | 'processado';
}
```

## 🌐 Deploy

- **GitHub**: https://github.com/mbaisi200/passaporte-sistema
- **Vercel**: https://passaporte-sistema.vercel.app

## 📝 Licença

Este projeto é proprietário e de uso exclusivo da SB Viagens e Turismo.

---

Desenvolvido por SB Viagens e Turismo
