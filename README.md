# Preço Inteligente 🧠💰

Plataforma SaaS de cotação inteligente de preços. Envie PDFs com listas de produtos e receba comparação automática de preços de marketplaces.

## Tecnologias

**Frontend**: Next.js 15, React, TailwindCSS, Framer Motion, Lucide Icons  
**Backend**: Python, FastAPI, SQLAlchemy, Pydantic  
**Banco**: PostgreSQL (Supabase)  
**Parsing**: pdfplumber, PyPDF, Tesseract OCR  
**Export**: openpyxl (Excel)

---

## Setup Rápido

### 1. Backend

```bash
cd backend

# Criar virtual environment
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Configurar banco (edite o .env com sua senha do Supabase)
# Vá em https://supabase.com/dashboard → Settings → Database → Connection string
# Substitua SUA_SENHA_DO_SUPABASE no arquivo .env

# Rodar servidor
uvicorn app.main:app --reload --port 8000
```

O backend estará em: **http://localhost:8000**  
Documentação Swagger: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev
```

O frontend estará em: **http://localhost:3000**

---

## Arquitetura

```
sistema de preço/
├── backend/
│   ├── app/
│   │   ├── main.py          # Entrypoint FastAPI
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy
│   │   ├── models/          # ORM Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   ├── routers/         # API Endpoints
│   │   ├── services/        # Business Logic
│   │   └── utils/           # Auth helpers
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js Pages
│   │   └── lib/             # API client, Auth
│   └── package.json
└── README.md
```

## Fluxo do Usuário

1. **Cadastro/Login** → criação de conta com JWT
2. **Upload PDF** → extração automática de produtos
3. **Produtos** → revisão, aprovação/descarte, margem
4. **Busca de Preços** → pesquisa em marketplaces
5. **Análise** → estatísticas de mercado por produto
6. **Ofertas** → grid de ofertas com links clicáveis
7. **Orçamento** → geração e exportação Excel

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário atual |
| POST | `/api/projects/upload` | Upload PDF |
| GET | `/api/projects` | Listar projetos |
| GET | `/api/products/project/{id}` | Listar produtos |
| PATCH | `/api/products/{id}/status` | Atualizar status |
| POST | `/api/offers/search/{id}` | Buscar preços |
| GET | `/api/offers/{id}/stats` | Estatísticas |
| POST | `/api/quotations/generate/{id}` | Gerar orçamento |
| GET | `/api/quotations/export/{id}` | Exportar Excel |
