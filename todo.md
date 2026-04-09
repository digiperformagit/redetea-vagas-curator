# Rede TEA - Curadoria de Vagas - TODO

## Backend - Schema e Banco de Dados
- [x] Criar tabela `jobs` com todos os campos necessários
- [x] Criar tabela `wp_credentials` para armazenar credenciais do WordPress
- [x] Adicionar índices para performance (source, status, city, category)
- [x] Criar tipos TypeScript para Job e WpCredentials

## Backend - Routers tRPC
- [x] Implementar `jobs.search()` com busca em Indeed, Catho e LLM
- [x] Implementar `jobs.list()` com filtros por status, categoria, cidade
- [x] Implementar `jobs.get()` para detalhes de uma vaga
- [x] Implementar `jobs.update()` para editar vaga
- [x] Implementar `jobs.approve()` com publicação no WordPress
- [x] Implementar `jobs.reject()` para rejeitar vaga
- [x] Implementar validação de duplicatas no WordPress antes de publicar
- [x] Implementar `wpCredentials.set()` para salvar credenciais
- [x] Implementar `wpCredentials.get()` para recuperar credenciais (sem senha)
- [x] Implementar `wpCredentials.test()` para testar conexão
- [x] Implementar `wpCredentials.delete()` para remover credenciais
- [x] Implementar `jobs.stats` para contadores por status

## Backend - Integração WordPress
- [x] Criar helper para autenticação Basic Auth com Application Password
- [x] Criar função para publicar vaga no WordPress
- [x] Criar função para mapear campos da vaga para formato WordPress
- [x] Implementar upload de logo para WordPress (featured image)
- [x] Implementar tratamento de erros da API WordPress
- [x] Verificar duplicatas via searchPosts antes de publicar

## Backend - Busca de Vagas
- [x] Implementar scraper para Indeed (via parsing HTML)
- [x] Implementar scraper para Catho (via parsing HTML)
- [x] Implementar geração de vagas via LLM para complementação
- [x] Adicionar rate limiting para não sobrecarregar fontes
- [x] Implementar tratamento de erros e silent fail por fonte

## Backend - Testes
- [x] Escrever testes para `jobs.get()` e `jobs.stats()`
- [x] Escrever testes para `jobs.approve()` sem credenciais WP
- [x] Escrever testes para `wpCredentials.get()` sem senha
- [x] Escrever testes para `jobs.reject()`
- [x] Todos os 8 testes passando

## Frontend - Layout e Navegação
- [x] Criar layout principal com sidebar (AppLayout)
- [x] Implementar navegação entre abas (Buscar, Aprovações, Configurações)
- [x] Criar componente de header com logo e user info
- [x] Exibir contadores de vagas pendentes/publicadas na sidebar
- [x] Tela de login para usuários não autenticados

## Frontend - Página de Busca
- [x] Criar formulário de busca com filtros por categoria
- [x] Criar filtro por cidade/estado
- [x] Implementar seletor de múltiplas categorias (toggle buttons)
- [x] Implementar seletor de múltiplas cidades (toggle buttons)
- [x] Criar botão "Buscar Vagas"
- [x] Adicionar loading state durante busca
- [x] Adicionar mensagem de erro se busca falhar
- [x] Adicionar botão "Selecionar Todas" para categorias e cidades

## Frontend - Listagem de Vagas (Aprovações)
- [x] Criar componente Card para exibir vaga
- [x] Exibir: Cargo, Empresa, Descrição resumida, Cidade, Estado, Categoria
- [x] Criar ação "Revisar" em cada card
- [x] Criar ação "Rejeitar" em cada card
- [x] Criar ação "Deletar" em cada card
- [x] Tabs por status: Pendentes, Aprovadas, Rejeitadas, Publicadas
- [x] Contadores de status no topo
- [x] Busca textual na listagem
- [x] Badge de fonte (Indeed, Catho, Gerada)
- [x] Link para WordPress quando publicada

## Frontend - Tela de Revisão/Edição
- [x] Criar formulário com todos os campos da vaga
- [x] Campos: Cargo, Logo, Descrição, Empresa, Telefone, Endereço, Cidade, Estado, CEP, E-mail, Site
- [x] Implementar seletor de múltiplas categorias com checkboxes
- [x] Implementar seletor de múltiplos locais com checkboxes
- [x] Adicionar preview de logo
- [x] Criar botão "Aprovar e Publicar"
- [x] Criar botão "Rejeitar"
- [x] Criar botão "Salvar Rascunho"
- [x] Criar botão "Voltar"
- [x] Implementar validação de campos obrigatórios
- [x] Exibir link para vaga original (fonte)
- [x] Exibir status de publicação

## Frontend - Aba de Configurações
- [x] Criar formulário para credenciais WordPress
- [x] Campo: URL do WordPress
- [x] Campo: Usuário do WordPress
- [x] Campo: Application Password (input type="password" com toggle)
- [x] Botão "Testar Conexão"
- [x] Botão "Salvar Credenciais"
- [x] Botão "Remover Credenciais"
- [x] Exibir status de conexão (conectado/desconectado)
- [x] Exibir data da última conexão testada
- [x] Guia de como obter Application Password
- [x] Dicas de segurança

## Frontend - UX/Validação
- [x] Implementar validação de formulários
- [x] Adicionar confirmação antes de publicar vaga
- [x] Adicionar confirmação antes de rejeitar vaga
- [x] Implementar loading states em botões
- [x] Implementar error handling com mensagens claras em português
- [x] Mensagens de erro específicas (credenciais não configuradas, duplicata, etc.)

## Documentação
- [x] Criar README com instruções de instalação (DreamHost e Cloudways)
- [x] Documentar como obter Application Password do WordPress
- [x] Criar guia de troubleshooting
