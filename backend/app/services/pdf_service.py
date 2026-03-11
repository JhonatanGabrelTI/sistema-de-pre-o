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
    """Parse product list from extracted PDF text using OpenAI LLM with Smart Cropping."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables.")
        return ExtracaoEdital(documento_valido=False, lotes=[])

    # --- SMART CROPPING LOGIC ---
    # Find the most relevant parts of the document (usually Termo de Referência or tables)
    keywords = [
        "TERMO DE REFERÊNCIA", "QUADRO DE ITENS", "LOTE 01", "VALOR ESTIMADO", 
        "DESCRIÇÃO DO OBJETO", "ESPECIFICAÇÕES TÉCNICAS", "ANEXO I"
    ]
    
    start_pos = -1
    for kw in keywords:
        pos = raw_text.upper().find(kw)
        if pos != -1:
            if start_pos == -1 or pos < start_pos:
                start_pos = pos
    
    # If found a keyword, start 500 chars before it to catch titles, otherwise start at 0
    start_point = max(0, start_pos - 500) if start_pos != -1 else 0
    # Take up to 25.000 characters (more than enough for most item lists and faster than 40k)
    truncated_text = raw_text[start_point : start_point + 25000]
    
    logger.info(f"PDF AI Parse: Text cropped at position {start_point}, sending {len(truncated_text)} chars.")

    try:
        client = OpenAI(api_key=api_key)
        
        system_prompt = """# ROLE E OBJETIVO
Você é uma API ultra-rápida de Extração de Dados. Sua missão é localizar a tabela de itens/produtos em um edital.
Ignore textos jurídicos, leis e preâmbulos. Foco total em: Item, Descrição, Unidade, Quantidade e Preço.

# REGRAS CRÍTICAS
1. UNIFIQUE DESCRIÇÕES: Se o PDF quebrou a descrição de um item em várias linhas, junte-as em uma só.
2. LIMPEZA: Remova lixo de cabeçalho/rodapé que possa estar entre os itens.
3. NUMÉRICOS: Converta "R$ 1.234,56" para 1234.56.
4. LOTE: Extraia o número do lote se disponível.
"""
        
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini", # Using mini for speed and cost effectiveness
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extraia os itens deste texto:\n\n{truncated_text}"}
            ],
            response_format=ExtracaoEdital,
            temperature=0.0
        )
        
        result = completion.choices[0].message.parsed
        return result if result else ExtracaoEdital(documento_valido=False, lotes=[])
        
    except Exception as e:
        logger.error(f"Error during OpenAI extraction: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])
