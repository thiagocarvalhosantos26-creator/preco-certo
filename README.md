# PreçoCerto

Landing page estática para promover o **AMD Ryzen 5 4600G** com link de
afiliado da Amazon.

O frontend roda apenas com HTML, CSS e JavaScript puro, pronto para GitHub
Pages. A página não mostra preço fixo: todos os CTAs orientam o visitante a
consultar preço e disponibilidade diretamente na Amazon.

## Arquivos principais

- `index.html`: estrutura da landing page, seções, botões e aviso de afiliado.
- `style.css`: layout responsivo, visual tecnológico, cards, hero e CTAs.
- `app.js`: configuração do link afiliado e menu mobile.
- `assets/ryzen-5-4600g-real.jpg`: foto real usada no hero do produto.
- `assets/product-placeholder.svg`: imagem ilustrativa usada se a foto real não carregar.

## Onde trocar o link de afiliado

Edite a constante `PRODUCT` no início de `app.js`:

```js
const PRODUCT = {
  affiliateUrl: "https://www.amazon.com.br/s?k=AMD+Ryzen+5+4600G&tag=thiago2607-20",
};
```

Todos os links com o atributo `data-affiliate-link` usam automaticamente
`PRODUCT.affiliateUrl`.

## Onde trocar a imagem do produto

Coloque a imagem real do produto em:

```text
assets/ryzen-5-4600g-real.jpg
```

Se esse arquivo não carregar, o site usa automaticamente `assets/product-placeholder.svg`.

## Onde trocar os vídeos

Os cards de vídeo são placeholders estáticos no `index.html`, na seção
`videos`. Para trocar por links reais depois, substitua o conteúdo do card ou
envolva o thumbnail com uma tag `<a>` apontando para o vídeo.

## Como abrir localmente

Basta abrir `index.html` no navegador.

Se preferir servir como site local:

```bash
python3 -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

## Deploy no GitHub Pages

Publique a raiz do projeto normalmente. A landing page não depende de backend,
API externa, scraping nem variáveis de ambiente para funcionar.

## Aviso sobre backend

A pasta `backend/` foi preservada no projeto para não remover código existente,
mas a landing page atual não depende dela.

Se no futuro você quiser voltar para um buscador dinâmico com Amazon Creators
API, mantenha credenciais somente no backend e nunca coloque segredos no
frontend.
