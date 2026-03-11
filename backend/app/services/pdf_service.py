import re
import io
import os
import logging
import base64
from typing import List, Tuple, Optional
from pydantic import BaseModel, Field
from openai import OpenAI

logger = logging.getLogger(__name__)

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

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber with PyPDF fallback."""
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip() and len(text.strip()) > 100:
            logger.info("Text extracted via pdfplumber")
            return text.strip()
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if text.strip() and len(text.strip()) > 100:
            logger.info("Text extracted via PyPDF")
            return text.strip()
    except Exception as e:
        logger.warning(f"PyPDF failed: {e}")

    return "" # Return empty to trigger Vision OCR

def parse_products_from_pdf_vision(file_bytes: bytes) -> ExtracaoEdital:
    """Extract data using OpenAI Vision (GPT-4o) for scanned PDFs."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ExtracaoEdital(documento_valido=False, lotes=[])

    try:
        import fitz # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        # Take up to 5 pages to avoid context token limits/cost
        client = OpenAI(api_key=api_key)
        messages = [
            {
                "role": "system", 
                "content": "Você é um especialista em licitações. Extraia tabelas de itens de compras de imagens de editais. Responda APENAS em JSON."
            }
        ]
        
        user_content = [{"type": "text", "text": "Extraia os itens destas páginas de edital:"}]
        
        for i in range(min(5, doc.page_count)):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Better quality for OCR
            img_bytes = pix.tobytes("png")
            base64_image = base64.b64encode(img_bytes).decode('utf-8')
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{base64_image}"}
            })
            
        messages.append({"role": "user", "content": user_content})
        
        completion = client.beta.chat.completions.parse(
            model="gpt-4o", # Full GPT-4o for best vision quality
            messages=messages,
            response_format=ExtracaoEdital,
            temperature=0.0
        )
        
        return completion.choices[0].message.parsed
    except Exception as e:
        logger.error(f"Vision OCR failed: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])

def parse_products_from_text(raw_text: str) -> ExtracaoEdital:
    """Parse product list from extracted PDF text using OpenAI LLM."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ExtracaoEdital(documento_valido=False, lotes=[])

    # Truncate to avoid token limits
    truncated_text = raw_text[:30000]
    
    try:
        client = OpenAI(api_key=api_key)
        system_prompt = "Extraia a tabela de itens/produtos deste edital. Foco em: Item, Descrição, Unidade, Quantidade e Preço."
        
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extraia os itens:\n\n{truncated_text}"}
            ],
            response_format=ExtracaoEdital,
            temperature=0.0
        )
        
        return completion.choices[0].message.parsed
    except Exception as e:
        logger.error(f"Text-based extraction failed: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])
