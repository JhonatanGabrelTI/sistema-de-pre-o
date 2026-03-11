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
    numero_item: Optional[str] = Field(None, description="Número abstrato do item, se houver")
    descricao: str = Field(..., description="Nome e descrição principal do produto")
    quantidade: Optional[float] = Field(None, description="Quantidade do produto")
    unidade_medida: Optional[str] = Field(None, description="Unidade de medida")
    valor_unitario_estimado: Optional[float] = Field(None, description="Valor unitário estimado ou máximo aceito")
    valor_total_estimado: Optional[float] = Field(None, description="Valor total estimado")

class LoteExtracted(BaseModel):
    numero_lote: Optional[str]
    itens: List[ItemExtracted]

class ExtracaoEdital(BaseModel):
    documento_valido: bool
    lotes: List[LoteExtracted]

def parse_page_ranges(pages_config: str, max_pages: int) -> List[int]:
    """Parse a string like '1-3, 5' into a list of 0-based page indices: [0, 1, 2, 4]"""
    if not pages_config or not pages_config.strip():
        return list(range(max_pages))
    
    selected_pages = set()
    parts = pages_config.split(',')
    
    for part in parts:
        part = part.strip()
        if not part: continue
        
        if '-' in part:
            try:
                start, end = part.split('-')
                start_idx = int(start.strip()) - 1
                end_idx = int(end.strip()) - 1
                
                # Protect bounds
                start_idx = max(0, min(start_idx, max_pages - 1))
                end_idx = max(0, min(end_idx, max_pages - 1))
                
                if start_idx <= end_idx:
                    for i in range(start_idx, end_idx + 1):
                        selected_pages.add(i)
            except ValueError:
                continue
        else:
            try:
                idx = int(part) - 1
                if 0 <= idx < max_pages:
                    selected_pages.add(idx)
            except ValueError:
                continue
                
    if not selected_pages:
        return list(range(max_pages))
        
    return sorted(list(selected_pages))

def extract_text_from_pdf(file_bytes: bytes, pages_config: str = None) -> str:
    """Extract text from PDF using pdfplumber with PyPDF fallback."""
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            selected_indices = parse_page_ranges(pages_config, len(pdf.pages))
            for idx in selected_indices:
                page_text = pdf.pages[idx].extract_text()
                if page_text:
                    text += f"--- PÁGINA {idx + 1} ---\n{page_text}\n"
        if text.strip() and len(text.strip()) > 100:
            logger.info("Text extracted via pdfplumber")
            return text.strip()
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        selected_indices = parse_page_ranges(pages_config, len(reader.pages))
        for idx in selected_indices:
            page_text = reader.pages[idx].extract_text()
            if page_text:
                text += f"--- PÁGINA {idx + 1} ---\n{page_text}\n"
        if text.strip() and len(text.strip()) > 100:
            logger.info("Text extracted via PyPDF")
            return text.strip()
    except Exception as e:
        logger.warning(f"PyPDF failed: {e}")

    return "" # Return empty to trigger Vision OCR

def parse_products_from_pdf_vision(file_bytes: bytes, pages_config: str = None) -> ExtracaoEdital:
    """Extract data using OpenAI Vision (GPT-4o) for scanned PDFs."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ExtracaoEdital(documento_valido=False, lotes=[])

    try:
        import fitz # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        client = OpenAI(api_key=api_key)
        system_prompt = (
            "Atue como um extrator de dados de alta precisão. Leia estas páginas e localize a lista de produtos/serviços que serão comprados.\n\n"
            "Preencha corretamente a Descrição, Quantidade, Unidade, Valor Unitário e Número do Item.\n"
            "Responda APENAS o JSON. Apenas liste os itens encontrados nestas páginas. Se não houver itens nas páginas, retorne documento_valido=false."
        )
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        user_content = [{"type": "text", "text": "Extraia os itens destas páginas especificadas:"}]
        
        selected_indices = parse_page_ranges(pages_config, doc.page_count)
        
        # Max 10 images to prevent token blast
        for i, idx in enumerate(selected_indices):
            if i >= 10: break
            page = doc.load_page(idx)
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

def parse_products_from_text(raw_text: str, pages_config: str = None) -> ExtracaoEdital:
    """Parse product list from extracted PDF text using OpenAI LLM."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ExtracaoEdital(documento_valido=False, lotes=[])

    # Truncate to avoid token limits
    truncated_text = raw_text[:30000]
    
    try:
        client = OpenAI(api_key=api_key)
        system_prompt = (
            "Atue como um extrator de dados de alta precisão. Leia o texto e localize a lista de itens.\n\n"
            "Preencha corretamente a Descrição, Quantidade, Unidade, Valor Unitário e Número do Item da estrutura.\n"
            "Responda APENAS o JSON conforme o schema exigido. Se não houver lista, retonre documento_valido=false."
        )
        
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
