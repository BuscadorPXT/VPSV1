# API Pública Buscador PXT

Esta documentação descreve os endpoints públicos da API REST do Buscador PXT para busca e consulta de produtos Apple sem necessidade de autenticação.

## Base URL
```
https://seu-dominio.replit.app/api/public
```

## Rate Limiting
- **Limite**: 60 requisições por minuto por endereço IP
- **Resposta em caso de limite**: HTTP 429 com mensagem de erro

## Formato de Resposta
Todos os endpoints retornam respostas no formato JSON padronizado:

```json
{
  "success": true|false,
  "data": object|null,
  "message": "string (opcional)",
  "timestamp": "2025-07-03T18:56:51.346Z"
}
```

## Endpoints

### 1. GET /api/public/products

Lista produtos Apple com filtros opcionais e paginação.

#### Parâmetros Query (opcionais)
- `model` (string): Filtro por modelo do produto (ex: "iPhone 16", "MacBook")
- `capacity` (string): Filtro por capacidade/storage (ex: "128GB", "256GB")
- `color` (string): Filtro por cor (ex: "Black", "Silver")
- `region` (string): Filtro por região (ex: "SP", "RJ")
- `limit` (number): Número máximo de produtos por página (min: 1, max: 100, padrão: 50)
- `offset` (number): Número de produtos a pular para paginação (padrão: 0)

#### Exemplo de Requisição
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/products?model=iphone&limit=5&offset=0" \
     -H "Content-Type: application/json"
```

#### Exemplo de Resposta
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 507653,
        "modelo": "CABO IPHONE ENTRADA TIPO C 1M",
        "capacidade": "",
        "cor": "",
        "regiao": null,
        "menorPreco": 10,
        "fornecedor": "LOJA 31 0181",
        "atualizadoEm": "2025-06-14T23:03:51.740Z",
        "disponivel": true
      }
    ],
    "pagination": {
      "limit": 5,
      "offset": 0,
      "total": 1
    },
    "filters": {
      "model": "iphone",
      "capacity": null,
      "color": null,
      "region": null
    }
  },
  "timestamp": "2025-07-03T18:56:57.126Z"
}
```

### 2. GET /api/public/stats

Retorna estatísticas resumidas do sistema.

#### Parâmetros
Nenhum parâmetro necessário.

#### Exemplo de Requisição
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/stats" \
     -H "Content-Type: application/json"
```

#### Exemplo de Resposta
```json
{
  "success": true,
  "data": {
    "totalProdutos": 143526,
    "fornecedoresAtivos": 220,
    "precoMedio": 4084.06,
    "menorPreco": 7,
    "maiorPreco": 53000,
    "ultimaSincronizacao": "2025-06-21T22:04:18.972Z",
    "statusUltimaSincronizacao": "success"
  },
  "timestamp": "2025-07-03T18:56:51.346Z"
}
```

## Códigos de Status HTTP

- **200 OK**: Requisição bem-sucedida
- **400 Bad Request**: Parâmetros inválidos
- **429 Too Many Requests**: Limite de rate limiting excedido
- **500 Internal Server Error**: Erro interno do servidor

## Exemplos de Uso

### Buscar iPhones com capacidade específica
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/products?model=iphone&capacity=128GB&limit=10" \
     -H "Content-Type: application/json"
```

### Buscar produtos por cor
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/products?color=black&limit=20" \
     -H "Content-Type: application/json"
```

### Paginação (página 2, 25 itens por página)
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/products?limit=25&offset=25" \
     -H "Content-Type: application/json"
```

### Obter estatísticas do sistema
```bash
curl -X GET "https://seu-dominio.replit.app/api/public/stats" \
     -H "Content-Type: application/json"
```

## Estrutura de Dados

### Produto
```typescript
interface Produto {
  id: number;                    // ID único do produto
  modelo: string;               // Modelo do produto
  capacidade: string;           // Capacidade/storage
  cor: string;                  // Cor do produto
  regiao: string | null;        // Região de disponibilidade
  menorPreco: number;           // Menor preço encontrado
  fornecedor: string;           // Nome do fornecedor
  atualizadoEm: string;         // Data da última atualização (ISO 8601)
  disponivel: boolean;          // Se o produto está disponível
}
```

### Estatísticas
```typescript
interface Estatisticas {
  totalProdutos: number;        // Total de produtos ativos
  fornecedoresAtivos: number;   // Total de fornecedores ativos
  precoMedio: number;           // Preço médio dos produtos
  menorPreco: number;           // Menor preço encontrado
  maiorPreco: number;           // Maior preço encontrado
  ultimaSincronizacao: string;  // Data da última sincronização (ISO 8601)
  statusUltimaSincronizacao: string; // Status da última sincronização
}
```

## Limitações

- Os dados são atualizados através de sincronização com Google Sheets
- A API utiliza dados da base PostgreSQL para melhor performance
- Filtros são case-insensitive e usam busca parcial (LIKE)
- Produtos são ordenados por menor preço por padrão
- Rate limiting é aplicado por endereço IP

## Suporte

Para questões técnicas ou suporte, entre em contato através dos canais oficiais do Buscador PXT.