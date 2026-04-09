# Arquitetura - Rede TEA Curadoria de Vagas

## Visão Geral

Aplicação de curadoria de vagas que busca automaticamente em fontes externas, permite revisão/edição e publica no WordPress via API REST.

## Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. `jobs` - Vagas encontradas/em processamento
- `id` (PK)
- `externalId` - ID da vaga na fonte externa (Indeed, LinkedIn, etc.)
- `source` - Fonte da vaga (indeed, linkedin, glassdoor, catho)
- `title` - Título/Cargo
- `company` - Nome da empresa
- `description` - Descrição da vaga
- `city` - Cidade
- `state` - Estado (UF)
- `address` - Endereço completo
- `zipCode` - CEP
- `email` - E-mail de contato
- `phone` - Telefone
- `website` - Site da empresa
- `logoUrl` - URL do logo
- `categories` - JSON array de categorias (múltipla escolha)
- `locations` - JSON array de locais (múltipla escolha)
- `status` - pending | approved | rejected | published
- `wpPostId` - ID do post no WordPress (quando publicado)
- `createdAt`
- `updatedAt`
- `publishedAt`

#### 2. `wp_credentials` - Credenciais do WordPress
- `id` (PK)
- `userId` (FK para users)
- `wpUrl` - URL base do WordPress
- `wpUsername` - Usuário do WordPress
- `wpAppPassword` - Application Password (criptografado)
- `isActive` - Flag para ativar/desativar
- `lastTestedAt` - Última vez que as credenciais foram testadas
- `createdAt`
- `updatedAt`

### Categorias (Constantes)
```
Acompanhante Terapêutico
Administrativo
Aplicador ABA
Coordenador
Estágio
Fisioterapeuta
Fonoaudióloga
Limpeza
Musicoterapeuta
Nutricionista
Psicólogo
Psicomotricista
Psicopedagogo
Recepcionista
RH
Terapeuta Ocupacional
```

### Locais (Constantes)
```
Araraquara, Atibaia, Barueri, Belém, Belo Horizonte, Campinas, Cotia, Cubatão, Curitiba, 
Fazenda Rio Grande, Fortaleza, Goiânia, Guarujá, Guarulhos, Indaiatuba, Juiz de Fora, 
Jundiaí, Maceió, Mauá, Niterói, Osasco, Porto Alegre, Praia Grande, Ribeirão Preto, 
Rio de Janeiro, Rio Verde, Santo André, Santos, São Caetano do Sul, São José do Rio Preto, 
São José dos Campos, São Paulo, São Vicente, Saquarema, Socorro, Sorocaba, Vitória
```

## Fluxo de Dados

1. **Busca** → Usuário seleciona categorias/cidades e clica em "Buscar"
2. **Scraping** → Backend busca em Indeed, LinkedIn, Glassdoor, Catho
3. **Armazenamento** → Vagas salvas com status `pending`
4. **Validação de Duplicatas** → Verifica se vaga já existe no WordPress
5. **Listagem** → Frontend exibe cards das vagas
6. **Revisão/Edição** → Usuário abre vaga e edita campos
7. **Publicação** → Botão "Aprovar e Publicar" envia para WordPress via API REST
8. **Atualização de Status** → Status muda para `published` e `wpPostId` é salvo

## Endpoints tRPC

### Backend (server/routers.ts)

#### Jobs Router
- `jobs.search(categories, cities)` → Busca vagas em fontes externas
- `jobs.list(status?, category?, city?)` → Lista vagas com filtros
- `jobs.get(id)` → Detalhes de uma vaga
- `jobs.update(id, data)` → Atualiza vaga
- `jobs.approve(id)` → Aprova e publica no WordPress
- `jobs.reject(id)` → Rejeita vaga
- `jobs.checkDuplicate(title, company)` → Valida duplicata no WordPress

#### WordPress Credentials Router
- `wpCredentials.set(wpUrl, wpUsername, wpAppPassword)` → Salva credenciais
- `wpCredentials.get()` → Retorna credenciais (sem password)
- `wpCredentials.test()` → Testa conexão com WordPress
- `wpCredentials.delete()` → Remove credenciais

#### Stats Router
- `stats.overview()` → Contadores: pending, approved, rejected, published

## Integração WordPress

### API REST do WordPress
- Endpoint: `{wpUrl}/wp-json/wp/v2/posts`
- Autenticação: Basic Auth com Application Password
- Campos mapeados:
  - `title` → `title`
  - `description` → `content`
  - `company` → Meta field
  - `categories` → Taxonomia customizada
  - `locations` → Taxonomia customizada
  - `logoUrl` → Featured image (via URL)

## Frontend Pages

1. **Home** → Painel de busca com filtros
2. **Results** → Lista de vagas em cards
3. **Review** → Tela de revisão/edição de vaga
4. **Approvals** → Aba com status de vagas
5. **Settings** → Configurações e credenciais WordPress

## Segurança

- Application Password criptografado no banco (usando bcrypt ou similar)
- Validação de entrada em todos os endpoints
- Rate limiting para busca de vagas
- Apenas usuário autenticado pode acessar
