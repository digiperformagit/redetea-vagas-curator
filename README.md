# Rede TEA — Curadoria de Vagas

Ferramenta de curadoria e publicação de vagas para o site [Rede TEA](https://redetea.com.br/). Permite buscar vagas automaticamente em fontes externas (Indeed, Catho e geração via IA), revisar e editar cada oportunidade, e publicar diretamente no WordPress via API REST com Application Password.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Busca Automatizada** | Pesquisa em Indeed, Catho e geração via LLM pelas categorias da Rede TEA |
| **Painel de Curadoria** | Lista de vagas com status: Pendentes, Aprovadas, Rejeitadas, Publicadas |
| **Revisão e Edição** | Formulário completo com todos os campos do WordPress |
| **Publicação Direta** | Envia a vaga para o WordPress via API REST com Application Password |
| **Validação de Duplicatas** | Verifica se a vaga já existe no WordPress antes de publicar |
| **Configurações Seguras** | Credenciais do WordPress salvas no banco de dados, nunca expostas ao frontend |

---

## Pré-requisitos

- **Node.js** 18 ou superior
- **pnpm** 10 ou superior (`npm install -g pnpm`)
- **MySQL** 5.7+ ou **MariaDB** 10.5+
- **WordPress** com plugin **Application Passwords** ativado (nativo desde WP 5.6)

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/redetea-vagas-curator.git
cd redetea-vagas-curator
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados (MySQL/MariaDB)
DATABASE_URL=mysql://usuario:senha@localhost:3306/redetea_vagas

# Segurança
JWT_SECRET=sua_chave_secreta_aleatoria_aqui

# Manus OAuth (necessário para autenticação)
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=seu_open_id
OWNER_NAME=Seu Nome

# LLM (para geração de vagas via IA)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
```

### 4. Criar o banco de dados

```bash
# Criar banco de dados no MySQL
mysql -u root -p -e "CREATE DATABASE redetea_vagas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Executar migrações
pnpm db:push
```

### 5. Build para produção

```bash
pnpm build
```

### 6. Iniciar o servidor

```bash
# Produção
pnpm start

# Desenvolvimento
pnpm dev
```

---

## Instalação no DreamHost (VPS)

### Pré-requisitos no DreamHost
- Plano **VPS** ou **DreamCompute** (shared hosting não suporta Node.js)
- Acesso SSH habilitado
- Node.js instalado via NVM

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20

# Instalar pnpm
npm install -g pnpm pm2
```

### Deploy no DreamHost

```bash
# 1. Clonar e instalar
git clone ... && cd redetea-vagas-curator
pnpm install
cp .env.example .env
# Editar .env com suas configurações
nano .env

# 2. Build
pnpm build

# 3. Iniciar com PM2
pm2 start dist/index.js --name "redetea-vagas" --env production
pm2 save
pm2 startup
```

### Nginx como proxy reverso (DreamHost)

```nginx
server {
    listen 80;
    server_name vagas-curator.seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Instalação no Cloudways

O Cloudways é a opção mais simples para Node.js.

### Passo a passo

1. Crie um servidor **Node.js** no Cloudways (DigitalOcean, Linode ou Vultr recomendados)
2. Acesse via SSH e clone o repositório na pasta da aplicação
3. Configure as variáveis de ambiente no painel do Cloudways em **Application Settings → Environment Variables**
4. Configure o banco de dados MySQL nas variáveis de ambiente
5. Execute `pnpm install && pnpm build`
6. Configure o **Document Root** para `dist/` e o **Start Command** para `node dist/index.js`

### Variáveis de ambiente no Cloudways

No painel do Cloudways, adicione cada variável do `.env` em **Application → Environment Variables**.

---

## Configuração do WordPress

### Gerar Application Password

1. Acesse o painel Admin do WordPress (`/wp-admin`)
2. Vá para **Usuários → Seu Perfil**
3. Desça até a seção **"Application Passwords"**
4. Digite um nome descritivo (ex: `Rede TEA Curator`)
5. Clique em **"Adicionar Application Password"**
6. **Copie a senha gerada** — ela só é exibida uma vez!

### Configurar na ferramenta

1. Acesse a aba **Configurações** na ferramenta
2. Preencha:
   - **URL do WordPress**: `https://redetea.com.br`
   - **Usuário**: seu usuário admin do WordPress
   - **Application Password**: a senha copiada no passo anterior
3. Clique em **Salvar Credenciais**
4. A ferramenta testará a conexão automaticamente

---

## Como usar

### 1. Buscar Vagas

1. Acesse a aba **Buscar Vagas**
2. Selecione as **categorias** desejadas (ex: Psicólogo, Fonoaudióloga)
3. Selecione as **cidades** onde buscar
4. Clique em **Buscar Vagas**
5. Aguarde — a busca pode levar 30-60 segundos

### 2. Revisar e Editar

1. Acesse a aba **Aprovações** → tab **Pendentes**
2. Clique em **Revisar** em qualquer vaga
3. Edite os campos conforme necessário
4. Verifique se as **categorias** e **locais** estão corretos

### 3. Publicar

1. Na tela de revisão, clique em **Aprovar e Publicar**
2. Confirme na caixa de diálogo
3. A vaga será publicada automaticamente no WordPress
4. Um link para o post será exibido na tela

---

## Fontes de Busca

| Fonte | Método | Observações |
|---|---|---|
| **Indeed** | Parsing HTML | Respeita rate limiting (500ms entre requests) |
| **Catho** | Parsing HTML | Respeita rate limiting (600ms entre requests) |
| **IA (LLM)** | Geração via API | Gera vagas realistas para demonstração |

> **Nota sobre scraping**: A ferramenta respeita os limites dos sites e utiliza delays entre requisições. As vagas geradas por IA são marcadas como "Gerada" e devem ser revisadas cuidadosamente antes da publicação.

---

## Estrutura do Projeto

```
redetea-vagas-curator/
├── client/                 # Frontend React + Vite
│   └── src/
│       ├── pages/          # Páginas principais
│       │   ├── Home.tsx    # Busca de vagas
│       │   ├── Approvals.tsx # Listagem e aprovações
│       │   ├── Review.tsx  # Revisão e edição
│       │   └── Settings.tsx # Configurações WordPress
│       └── components/
│           └── AppLayout.tsx # Layout com sidebar
├── server/                 # Backend Express + tRPC
│   ├── routers/
│   │   ├── jobs.ts         # Endpoints de vagas
│   │   └── wpCredentials.ts # Endpoints de credenciais
│   ├── jobScraper.ts       # Motor de busca de vagas
│   ├── wordpress.ts        # Integração WordPress API REST
│   └── db.ts               # Helpers do banco de dados
├── drizzle/
│   └── schema.ts           # Schema do banco de dados
└── shared/
    └── constants.ts        # Categorias e locais da Rede TEA
```

---

## Troubleshooting

### Erro "WordPress credentials not configured"
Configure as credenciais na aba **Configurações** antes de publicar vagas.

### Erro "Vaga já existe no WordPress"
A ferramenta detectou uma vaga com o mesmo título já publicada no WordPress. Edite o título da vaga ou verifique se ela já foi publicada anteriormente.

### Erro "Failed to connect to WordPress"
Verifique se:
- A URL do WordPress está correta (com `https://`)
- O usuário existe no WordPress
- A Application Password foi copiada corretamente (com os espaços)
- O WordPress está acessível publicamente

### Busca retorna 0 vagas
- Verifique sua conexão com a internet
- Tente selecionar menos categorias e cidades
- As fontes externas podem estar temporariamente indisponíveis

---

## Licença

Uso interno — Rede TEA. Todos os direitos reservados.
