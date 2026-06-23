# PreçoCerto

Buscador de produtos Amazon com frontend estático em HTML, CSS e JavaScript e
backend Node.js separado. Credenciais, tokens OAuth e chamadas à Amazon ficam
exclusivamente no backend.

## Integração atual

O projeto usa a **Amazon Creators API**, substituta oficial da Product
Advertising API 5.0 desde **15 de maio de 2026**.

O frontend continua consumindo o mesmo contrato:

```text
GET /api/search?q=notebook
```

Internamente, o backend possui três camadas:

- `productSearchService.js`: contrato genérico de busca usado pela rota HTTP;
- `amazonCreatorsApi.js`: adaptador real da Amazon Creators API;
- `amazonMockProvider.js`: resultados simulados para desenvolvimento local.

Isso permite substituir ou acrescentar provedores sem alterar o frontend.

## Pré-requisitos da Amazon

Para usar o modo real, sua conta precisa:

1. estar aceita no Amazon Associates do marketplace desejado;
2. ter acesso aprovado à Creators API;
3. possuir Credential ID, Credential Secret e Version gerados em
   **Associates Central → Tools → Creators API**;
4. possuir um Partner Tag válido para o marketplace.

Credenciais antigas `AMAZON_ACCESS_KEY` e `AMAZON_SECRET_KEY` da PA-API não
funcionam na Creators API.

Documentação oficial:

- [Introdução](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction)
- [Migração da PA-API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi)
- [SearchItems](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items)
- [Autenticação via cURL](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl)

## Rodar localmente em modo mock

O mock não consulta a Amazon, não usa scraping e identifica claramente os
resultados como simulados.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

O `.env.example` já usa:

```env
AMAZON_API_MODE=mock
```

Em outro terminal, na raiz:

```bash
python3 -m http.server 5500
```

Abra `http://localhost:5500`.

## Ativar a Creators API real

Edite `backend/.env`:

```env
PRODUCT_SEARCH_PROVIDER=amazon-creators
AMAZON_API_MODE=live

AMAZON_CREATORS_CREDENTIAL_ID=seu_credential_id
AMAZON_CREATORS_CREDENTIAL_SECRET=seu_credential_secret
AMAZON_CREATORS_CREDENTIAL_VERSION=3.1

AMAZON_PARTNER_TAG=seu_tracking_id
AMAZON_MARKETPLACE=www.amazon.com.br
```

Use exatamente a versão exibida junto à credencial. O backend suporta:

- `2.1`, `2.2` e `2.3`: OAuth Cognito;
- `3.1`, `3.2` e `3.3`: Login with Amazon OAuth.

O endpoint de token é escolhido automaticamente pela versão. O token fica
somente em memória, é reutilizado e renovado antes do vencimento de uma hora.

Para Amazon Brasil:

```env
AMAZON_MARKETPLACE=www.amazon.com.br
```

Não edite os parâmetros dos links devolvidos pela Creators API. Eles contêm a
atribuição necessária para o Partner Tag.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `PRODUCT_SEARCH_PROVIDER` | Provedor usado pelo serviço genérico |
| `AMAZON_API_MODE` | `mock` ou `live` |
| `AMAZON_CREATORS_CREDENTIAL_ID` | ID OAuth gerado pela Creators API |
| `AMAZON_CREATORS_CREDENTIAL_SECRET` | Segredo OAuth; apenas no backend |
| `AMAZON_CREATORS_CREDENTIAL_VERSION` | Versão 2.x ou 3.x da credencial |
| `AMAZON_PARTNER_TAG` | Tracking ID do marketplace |
| `AMAZON_MARKETPLACE` | Ex.: `www.amazon.com.br` |
| `AMAZON_CREATORS_API_BASE_URL` | Normalmente `https://creatorsapi.amazon` |
| `AMAZON_CREATORS_TOKEN_URL` | Sobrescrita opcional do endpoint OAuth |
| `AMAZON_CREATORS_MIN_REQUEST_INTERVAL_MS` | Intervalo entre chamadas; padrão `1100` |
| `FRONTEND_ORIGINS` | Origens autorizadas pelo CORS |
| `PORT` | Porta do Express |

O arquivo `backend/.env` está ignorado pelo Git. Nunca coloque qualquer
credencial no `app.js`, no GitHub Pages ou no repositório.

O adaptador serializa chamadas reais com intervalo conservador de 1,1 segundo,
compatível com o limite inicial documentado de até uma transação por segundo.

## Publicação

O GitHub Pages hospeda apenas o frontend. Publique `backend/` em um serviço
Node.js com HTTPS, como Render, Railway ou Fly.io.

No serviço:

1. cadastre as variáveis de ambiente;
2. use `AMAZON_API_MODE=live`;
3. configure a origem exata do GitHub Pages:

   ```env
   FRONTEND_ORIGINS=https://seu-usuario.github.io
   ```

4. no início de `app.js`, configure a URL HTTPS publicada:

   ```js
   const API_BASE_URL = "https://seu-backend.exemplo.com";
   ```

## Resposta da API

```json
{
  "consulta": "notebook",
  "total": 1,
  "produtos": [
    {
      "id": "ASIN",
      "asin": "ASIN",
      "nome": "Nome do produto",
      "imagem": "https://...",
      "preco": "R$ 1.999,00",
      "disponibilidade": "Em estoque",
      "linkAfiliado": "https://www.amazon.com.br/..."
    }
  ],
  "cache": false
}
```

Se a Creators API não fornecer preço, `preco` será `null` e o frontend mostrará
“Ver preço na Amazon”.

## Testes

```bash
npm --prefix backend test
```

Os testes usam respostas simuladas e não precisam de credenciais reais.
