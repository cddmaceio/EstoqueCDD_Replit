# Gestão Estoque CDD Maceió

## Objetivo

Plataforma de visualização de estoque snapshot baseada em upload de planilhas para consulta rápida de indicadores operacionais.

## Telas

### Login Admin

**Rota:** `/`

**Objetivo:** Autenticação de usuários administradores para gestão de dados.

**Componentes:**

- **Formulário de Login (E-mail e Senha)**: Autentica o administrador e redireciona para /admin/dashboard.
- **Link Consulta Pública**: Redireciona para a rota pública /estoque.

### Gestão de Dados (Admin)

**Rota:** `/admin/upload`

**Objetivo:** Área restrita para upload e processamento de planilhas de estoque.

**Componentes:**

- **Upload de Arquivo (Drag & Drop)**: Realiza o upload do arquivo .xlsx ou .csv, processa os dados e substitui o snapshot anterior.
- **Card Status do Último Upload**: Exibe o nome e data do último arquivo processado.

### Dashboard Operacional (Admin)

**Rota:** `/admin/dashboard`

**Objetivo:** Visão analítica dos indicadores de estoque após o processamento.

**Componentes:**

- **KPIs Totais (SKUs, % OK, % NOK, Média DOI)**
- **Gráfico Distribuição OK vs NOK**
- **Gráfico Produtos por Marca (Curva ABC)**

### Consulta de Estoque (Pública)

**Rota:** `/estoque`

**Objetivo:** Visualização detalhada e filtrável do estoque para equipes comerciais e gestores sem login.

**Componentes:**

- **Input de Busca Global**: Filtra os dados da tabela em tempo real pelo nome do produto ou marca.
- **Filtros Avançados (Selects)**: Filtra a lista por Marca, Status (OK/NOK) ou Curva ABC (A, B, C).
- **Tabela de Estoque Atual (Snapshot)**: Exibe Produto, Marca, Embalagem, DOI, Status, Demanda, Min e Max com paginação.

