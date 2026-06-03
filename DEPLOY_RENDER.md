# Deploy no Render.com — Guia Completo

Este guia mostra como fazer deploy da aplicação **Rede TEA Curator** no Render.com (gratuito) e apontar seu domínio do DreamHost para lá.

---

## Passo 1: Preparar o Projeto para Deploy

### 1.1 Criar arquivo `render.yaml`

Na raiz do projeto, crie um arquivo chamado `render.yaml`:

```yaml
services:
  - type: web
    name: redetea-vagas-curator
    env: node
    plan: free
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: VITE_APP_ID
        sync: false
      - key: OAUTH_SERVER_URL
        value: https://api.manus.im
      - key: VITE_OAUTH_PORTAL_URL
        value: https://manus.im
      - key: OWNER_OPEN_ID
        sync: false
      - key: OWNER_NAME
        sync: false
      - key: BUILT_IN_FORGE_API_URL
        value: https://api.manus.im
      - key: BUILT_IN_FORGE_API_KEY
        sync: false
      - key: VITE_FRONTEND_FORGE_API_KEY
        sync: false
      - key: VITE_FRONTEND_FORGE_API_URL
        value: https://api.manus.im
```

### 1.2 Verificar `package.json`

Certifique-se que o `package.json` tem os scripts corretos:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts"
  }
}
```

### 1.3 Fazer commit e push para GitHub

```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

> Se ainda não tem repositório Git, crie um:
> ```bash
> git init
> git add .
> git commit -m "Initial commit"
> git remote add origin https://github.com/seu-usuario/redetea-vagas-curator.git
> git push -u origin main
> ```

---

## Passo 2: Criar Banco de Dados no Render

### 2.1 Acessar Render.com

1. Vá para [render.com](https://render.com)
2. Clique em **Sign Up** e crie uma conta (use GitHub para facilitar)
3. Faça login

### 2.2 Criar PostgreSQL (ou MySQL)

1. No dashboard, clique em **New +**
2. Selecione **PostgreSQL** (ou **MySQL** se preferir)
3. Preencha:
   - **Name**: `redetea-vagas-db`
   - **Database**: `redetea_vagas`
   - **User**: `redetea_user`
   - **Region**: Escolha a mais próxima (ex: São Paulo)
   - **Plan**: Free (gratuito)
4. Clique em **Create Database**

### 2.3 Copiar a Connection String

Após criar o banco, copie a **Internal Database URL** (será usada na aplicação):

```
postgresql://redetea_user:PASSWORD@localhost:5432/redetea_vagas
```

> **Nota**: Se usar MySQL, o formato será:
> ```
> mysql://redetea_user:PASSWORD@localhost:3306/redetea_vagas
> ```

---

## Passo 3: Deploy da Aplicação

### 3.1 Criar Web Service

1. No dashboard do Render, clique em **New +**
2. Selecione **Web Service**
3. Escolha **Deploy from a Git repository**
4. Clique em **Connect GitHub** e autorize
5. Selecione o repositório `redetea-vagas-curator`

### 3.2 Configurar o Web Service

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `redetea-vagas-curator` |
| **Environment** | `Node` |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `pnpm start` |
| **Plan** | `Free` |

### 3.3 Adicionar Variáveis de Ambiente

Clique em **Environment** e adicione cada variável:

```
DATABASE_URL=postgresql://redetea_user:PASSWORD@localhost:5432/redetea_vagas
JWT_SECRET=gera_uma_chave_aleatoria_forte_aqui
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=seu_open_id
OWNER_NAME=Seu Nome
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api_manus
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
NODE_ENV=production
```

### 3.4 Iniciar o Deploy

1. Clique em **Create Web Service**
2. Aguarde o build (leva 5-10 minutos)
3. Quando terminar, você receberá uma URL como: `https://redetea-vagas-curator.onrender.com`

---

## Passo 4: Apontar Domínio do DreamHost

### 4.1 Obter URL do Render

Após o deploy, copie a URL fornecida pelo Render (ex: `https://redetea-vagas-curator.onrender.com`).

### 4.2 Configurar DNS no DreamHost

1. Acesse o painel do DreamHost
2. Vá para **Domains → Manage Domains**
3. Clique no seu domínio (ex: `vagas.redetea.com.br`)
4. Em **DNS Settings**, procure por **CNAME**
5. Aponte para o Render:
   - **Name**: `vagas` (ou seu subdomínio)
   - **Value**: `redetea-vagas-curator.onrender.com`

### 4.3 Aguardar Propagação

DNS pode levar 24-48 horas para propagar. Você pode verificar com:

```bash
nslookup vagas.redetea.com.br
```

---

## Passo 5: Configurar HTTPS (SSL)

### 5.1 No Render

1. Vá para **Settings** do seu Web Service
2. Em **Custom Domain**, adicione seu domínio: `vagas.redetea.com.br`
3. Render gera automaticamente um certificado SSL via Let's Encrypt

### 5.2 Forçar HTTPS

Adicione a variável de ambiente:

```
FORCE_HTTPS=true
```

---

## Passo 6: Executar Migrações do Banco

Após o deploy estar rodando, você precisa executar as migrações do banco:

### 6.1 Acessar Console do Render

1. No dashboard do Render, clique no seu Web Service
2. Vá para **Shell** (console)
3. Execute:

```bash
pnpm db:push
```

Isso criará as tabelas no banco de dados.

---

## Passo 7: Testar a Aplicação

1. Acesse `https://vagas.redetea.com.br` (ou sua URL do Render)
2. Faça login com suas credenciais Manus
3. Configure as credenciais do WordPress na aba **Configurações**
4. Teste uma busca de vagas

---

## Troubleshooting

### Erro: "Build failed"

**Solução**: Verifique os logs no Render:
1. Clique no Web Service
2. Vá para **Logs**
3. Procure por erros de build

Causas comuns:
- Falta de dependências (execute `pnpm install` localmente)
- Erro de TypeScript (execute `npx tsc --noEmit`)

### Erro: "Database connection failed"

**Solução**: Verifique a `DATABASE_URL`:
1. Copie a URL correta do banco PostgreSQL/MySQL
2. Certifique-se de que a senha está correta
3. Adicione a variável de ambiente novamente

### Aplicação lenta no plano Free

O Render coloca aplicações em "sleep" após 15 minutos de inatividade no plano Free. Para produção, considere um plano pago (~$7/mês).

### Domínio não aponta para o Render

1. Aguarde a propagação de DNS (até 48 horas)
2. Verifique o CNAME no DreamHost está correto
3. Use `nslookup` para verificar:
   ```bash
   nslookup vagas.redetea.com.br
   ```

---

## Próximos Passos

1. **Configurar backups automáticos** do banco de dados no Render
2. **Monitorar logs** regularmente para erros
3. **Atualizar a aplicação** fazendo push para GitHub (Render faz redeploy automaticamente)
4. **Considerar plano pago** se tiver muito tráfego

---

## Suporte

Para dúvidas:
- Documentação do Render: https://render.com/docs
- Documentação da aplicação: Ver `README.md`
