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
# admin: http://localhost:3000/admin  (ou /#/admin)
```

Se `ADMIN_PASSWORD` não for definida, a senha padrão é `durah2026`. **Troque antes de publicar.**

## Publicar

### Onde ficam produtos e fotos

O app escolhe sozinho, nesta ordem:
1. **Supabase**, se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` existirem (recomendado).
2. **Vercel Blob**, se `BLOB_READ_WRITE_TOKEN` existir.
3. **Disco** (`DATA_DIR`) fora da Vercel, ou **temporário** na Vercel sem nenhum dos dois.

### Supabase (recomendado)
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria a tabela `store_data` (protegida por RLS) e o bucket público `produtos` para as fotos.
3. Em **Project Settings → API**, copie:
   - **Project URL** → variável `SUPABASE_URL`
   - **service_role** (ou a *secret key* `sb_secret_...`) → variável `SUPABASE_SERVICE_ROLE_KEY`
4. Coloque as duas variáveis na hospedagem (na Vercel: **Settings → Environment Variables**) e faça um novo deploy.

> A chave secreta fica **só no servidor**. Nunca coloque essa chave no código do site nem a compartilhe.

No primeiro acesso, os 6 perfumes de exemplo são gravados no Supabase. O que você alterar no painel fica salvo lá, e as fotos vão para o bucket `produtos`.

### Vercel
Na Vercel o disco do servidor é somente leitura, então use o **Supabase** (acima) ou o **Vercel Blob** para guardar o catálogo e as fotos.

1. Importe este repositório na Vercel. As configurações já estão no `vercel.json`: o site sai de `public/` e a API roda em `api/index.js`. Não altere o *Framework Preset*.
2. Armazenamento: configure o Supabase (seção acima). Se preferir o Blob, abra **Storage → Create Database → Blob**, escolha acesso **Public** e conecte ao projeto. A variável `BLOB_READ_WRITE_TOKEN` é criada automaticamente.
3. Em **Settings → Environment Variables**, adicione:
   - `ADMIN_PASSWORD`: a senha do painel
   - `SESSION_SECRET`: um texto longo e aleatório
4. Em **Deployments**, clique em **Redeploy**.

Sem Supabase nem Blob, o site funciona, mas o painel mostra um aviso vermelho e as alterações se perdem.

### Outros serviços

Fora da Vercel, o app precisa do **Node.js 18 ou mais recente** e de uma **pasta persistente**, onde ficam o banco (`db.json`) e as fotos enviadas.

#### Render, Railway ou Fly.io
1. Conecte este repositório.
2. Use o comando de build `npm install` e o comando de start `npm start`.
3. Configure as variáveis de ambiente (veja `.env.example`):
   - `ADMIN_PASSWORD`: senha do painel
   - `SESSION_SECRET`: um texto longo e aleatório
   - `DATA_DIR`: caminho de um **disco/volume persistente**, por exemplo `/data`

> Sem disco persistente, os produtos cadastrados e as fotos se perdem a cada novo deploy.

#### Docker / VPS
```bash
docker build -t durah .
docker run -d -p 3000:3000 -e ADMIN_PASSWORD=sua-senha -e SESSION_SECRET=algo-aleatorio -v durah-data:/data durah
```

#### Hospedagem estática (só para demonstração)
A pasta `public/` também funciona sozinha (GitHub Pages, Netlify etc.) em **modo demonstração**. A loja funciona normalmente, mas as alterações feitas no painel ficam salvas só no navegador de quem editou e os clientes não as veem. Para a loja real, use o servidor Node.

## Estrutura

```
server.js            API (login, produtos, upload, configurações) + arquivos estáticos
storage.js           armazenamento: Supabase, Vercel Blob, disco ou temporário
supabase/schema.sql  tabela e bucket para o Supabase
public/index.html    página única (SPA) com SEO
public/css/          estilos
public/js/app.js     loja (rotas, catálogo, produto, sacola)
public/js/admin.js   painel administrativo
public/js/ui.js      utilitários, mensagens do WhatsApp, arte dos frascos
public/js/store.js   camada de dados (API ou modo demonstração)
seed.json            6 perfumes de exemplo (gravados no primeiro start)
public/data/seed.json  cópia usada só no modo demonstração sem servidor
api/index.js         entrada da função na Vercel
vercel.json          configuração da Vercel
data/                banco e fotos (criado automaticamente; fora do git)
```

## Personalizar

O número do WhatsApp (5548991154821), o Instagram, o horário, a barra de anúncio e o banner são editados no painel, na aba **Banner & loja**.

Os produtos de exemplo são fictícios. Edite ou exclua no painel e cadastre os seus.
