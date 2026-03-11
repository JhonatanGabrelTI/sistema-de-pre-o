import re
import io
import logging
from typing import List, Tuple, Optional, Optional

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber with PyPDF fallback."""
    text = ""

    # Try pdfplumber first
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            logger.info("Text extracted via pdfplumber")
            return text.strip()
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    # Fallback to PyPDF
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if text.strip():
            logger.info("Text extracted via PyPDF")
            return text.strip()
    except Exception as e:
        logger.warning(f"PyPDF failed: {e}")

    # Fallback to OCR (Tesseract)
    try:
        import pytesseract
        from PIL import Image
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        # OCR only works on image-based PDFs, simplified fallback
        logger.info("Attempting OCR fallback (requires Tesseract installed)")
    except Exception as e:
        logger.warning(f"OCR fallback failed: {e}")

    return text.strip() if text.strip() else "Não foi possível extrair texto do PDF."


import os
from pydantic import BaseModel, Field
from openai import OpenAI

class ItemExtracted(BaseModel):
    numero_item: int
    descricao: str
    quantidade: float
    unidade_medida: str
    valor_unitario_estimado: Optional[float]
    valor_total_estimado: Optional[float]

class LoteExtracted(BaseModel):
    numero_lote: Optional[str] = Field(None, description="Identificador do lote (ex: 1, 2, 'Lote Único')")
    itens: List[ItemExtracted]

class ExtracaoEdital(BaseModel):
    documento_valido: bool = Field(..., description="true se encontrou itens de compra, false se não encontrou")
    lotes: List[LoteExtracted]

def parse_products_from_text(raw_text: str) -> ExtracaoEdital:
    """Parse product list from extracted PDF text using OpenAI LLM."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables.")
        # Fallback empty extraction if no key is provided yet
        return ExtracaoEdital(documento_valido=False, lotes=[])

    try:
        client = OpenAI(api_key=api_key)
        
        system_prompt = """# ROLE E OBJETIVO
Você é uma API de Extração de Dados e Processamento de Linguagem Natural (NLP) especializada em licitações públicas brasileiras (Pregão Eletrônico, Concorrência, Dispensa).
Sua ÚNICA função é receber o texto de um edital em PDF, ignorar todo o jargão jurídico, localizar o "Termo de Referência" (ou lista de lotes/itens) e extrair os produtos/serviços a serem adquiridos.

# DIRETRIZES DE COMPORTAMENTO E EXCLUSÃO (STRICT)
1. ZERO RUÍDO: Ignore editais, preâmbulos, leis (ex: Lei 14.133), regras de habilitação, minutas de contrato, índices, cabeçalhos e rodapés gerados pelo leitor de PDF (ex: "--- PAGE X ---").
2. FOCO EXCLUSIVO: Procure por tabelas ou listas descritivas que contenham "Item", "Descrição", "Quantidade", "Unidade" e "Valor".
3. TRATAMENTO DE TEXTO QUEBRADO: Documentos em PDF frequentemente quebram descrições de itens em várias linhas. Você DEVE unificar essas linhas em uma string contínua, removendo quebras de linha (\\n) desnecessárias dentro da descrição do produto.
4. NORMALIZAÇÃO NUMÉRICA: Converta todas as quantidades e valores monetários para o formato numérico universal (float). 
   - Exemplo: "R$ 1.500,50" DEVE virar 1500.50.
   - Exemplo: "1.000" (quantidade) DEVE virar 1000.
   - Se um valor não existir, use null (não use "0" ou strings vazias).

PROCEDIMENTO INTERNO (CHAIN OF THOUGHT)
Antes de gerar o JSON, siga silenciosamente estes passos:
1. Escaneie o documento buscando a palavra "Lote" ou "Item" associada a tabelas de preços/quantidades.
2. Isole mentalmente o conteúdo do Termo de Referência.
3. Extraia linha por linha, associando os itens aos seus respectivos lotes.
4. Aplique a normalização numérica e de texto.
5. Valide se a estrutura corresponde exatamente ao Schema exigido.
"""
        
        # We need to limit the text size so we don't blow up the context window excessively
        # PDFs can be huge. We'll take up to the first 40000 characters (approx 10k tokens)
        truncated_text = raw_text[:40000]

        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Texto do edital:\n\n{truncated_text}"}
            ],
            response_format=ExtracaoEdital,
            temperature=0.0
        )
        
        result = completion.choices[0].message.parsed
        if result:
            return result
            
        return ExtracaoEdital(documento_valido=False, lotes=[])
        
    except Exception as e:
        logger.error(f"Error during OpenAI extraction: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])
