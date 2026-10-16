# DURAH Perfumes e Importados

Catálogo e vendas pelo WhatsApp para perfumes importados, árabes e de nicho. O app é mobile-first, com fundo preto e detalhes em amarelo, e tem um painel administrativo protegido por senha.

## O que tem

- **Loja:** página inicial com hero, banner de promoção, categorias, destaques, lançamentos e a seção "Por que comprar na DURAH". Tem também o catálogo com filtros (marca, gênero, família olfativa, preço, ocasião e busca por notas), a página de cada produto, as páginas de marcas e contato e um FAQ.
- **Página do produto:** galeria de fotos, pirâmide olfativa ilustrada, barras de fixação e projeção, estações e ocasiões, selo da família olfativa, bloco "Para quem gosta de…", ficha técnica e produtos relacionados.
- **WhatsApp:** cada botão abre o WhatsApp com a mensagem já preenchida. Isso vale para a compra de um produto, a sacola (todos os itens e o total), a lista de desejos, o botão flutuante e o "Me ajude a escolher".
- **Painel `/admin`:** adicionar, editar, duplicar e excluir produtos. Também dá para ativar ou ocultar, marcar como esgotado ou destaque e enviar até 4 fotos, que são convertidas automaticamente para WebP. Ali ficam ainda o banner de promoções, a barra de anúncio, os contatos e o backup.
- **Selos automáticos:** Importado, Nicho, Lançamento, Últimas unidades (estoque de 1 a 3), Esgotado e % de desconto.
- **SEO:** título e descrição por página, Open Graph, dados estruturados (Store e Product), `robots.txt` e `sitemap.xml`.

## Rodar localmente

```bash
npm install
ADMIN_PASSWORD=sua-senha npm start
# loja:  http://localhost:3000
# admin: http://localhost:3000/admin
```

Se `ADMIN_PASSWORD` não for definida, a senha padrão é `durah2026`. **Troque antes de publicar.**

## Publicar

O app precisa do **Node.js 18 ou mais recente** e de uma **pasta persistente**, onde ficam o banco (`db.json`) e as fotos enviadas.

### Render, Railway ou Fly.io
1. Conecte este repositório.
2. Use o comando de build `npm install` e o comando de start `npm start`.
3. Configure as variáveis de ambiente (veja `.env.example`):
   - `ADMIN_PASSWORD`: senha do painel
   - `SESSION_SECRET`: um texto longo e aleatório
   - `DATA_DIR`: caminho de um **disco/volume persistente**, por exemplo `/data`

> Sem disco persistente, os produtos cadastrados e as fotos se perdem a cada novo deploy.

### Docker / VPS
```bash
docker build -t durah .
docker run -d -p 3000:3000 -e ADMIN_PASSWORD=sua-senha -e SESSION_SECRET=algo-aleatorio -v durah-data:/data durah
```

### Hospedagem estática (só para demonstração)
A pasta `public/` também funciona sozinha (GitHub Pages, Netlify etc.) em **modo demonstração**. A loja funciona normalmente, mas as alterações feitas no painel ficam salvas só no navegador de quem editou e os clientes não as veem. Para a loja real, use o servidor Node.

## Estrutura

```
server.js            API (login, produtos, upload, configurações) + arquivos estáticos
public/index.html    página única (SPA) com SEO
public/css/          estilos
public/js/app.js     loja (rotas, catálogo, produto, sacola)
public/js/admin.js   painel administrativo
public/js/ui.js      utilitários, mensagens do WhatsApp, arte dos frascos
public/js/store.js   camada de dados (API ou modo demonstração)
public/data/seed.json  6 perfumes de exemplo (carregados no primeiro start)
data/                banco e fotos (criado automaticamente; fora do git)
```

## Personalizar

O número do WhatsApp (5548991154821), o Instagram, o horário, a barra de anúncio e o banner são editados no painel, na aba **Banner & loja**.

Os produtos de exemplo são fictícios. Edite ou exclua no painel e cadastre os seus.
