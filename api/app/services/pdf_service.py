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
    descricao: str = Field(..., description="Nome do produto ou serviço (se não encontrar texto limpo, coloque o bloco inteiro)")
    quantidade: Optional[float] = Field(None, description="Quantidade do produto")
    unidade_medida: Optional[str] = Field(None, description="Unidade de medida")
    valor_unitario_estimado: Optional[float] = Field(None, description="Valor unitário estimado ou máximo aceito")
    valor_total_estimado: Optional[float] = Field(None, description="Valor total estimado")

class LoteExtracted(BaseModel):
    numero_lote: Optional[str] = Field(None, description="Número do lote (ou grupo) ao qual pertence")
    itens: List[ItemExtracted]

class ExtracaoEdital(BaseModel):
    documento_valido: bool = Field(..., description="Verdadeiro se encontrou qualquer indício de tabela, preço ou produto")
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

def safe_float(val) -> Optional[float]:
    """Safely convert strings like '1.500,00', '10,5', or 'R$ 10.0' into valid floats."""
    if val is None or val == "":
        return None
    
    val_str = str(val).strip().upper().replace("R$", "").replace(" ", "")
    if val_str == "" or val_str == "NULL" or val_str == "NULO":
        return None
        
    try:
        # If European/Brazilian format: "1.500,00" -> "1500.00"
        # If it has both dots and commas, assume comma is decimal if it's the last separator
        if "," in val_str and "." in val_str:
            if val_str.rfind(",") > val_str.rfind("."):
                val_str = val_str.replace(".", "").replace(",", ".")
            else:
                val_str = val_str.replace(",", "")
        elif "," in val_str:
            val_str = val_str.replace(",", ".")
            
        return float(val_str)
    except Exception:
        return None

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
            "Atue como um extrator de dados de alta tolerância a falhas. Leia as páginas e extraia qualquer tabela, lista ou grupo de serviços/produtos com valores.\n"
            "Preencha Descrição, Quantidade, Unidade, Valor Unitário e Número do Item. Se algum campo faltar, deixe-o em nulo/null (não invente dados).\n"
            "Sua regra de ouro é: se houver UM item válido (produto, quantidade e preço), documento_valido=true.\n"
            "Retorne APENAS UM JSON válido com a seguinte estrutura estrita: \n"
            '{"documento_valido": true, "lotes": [{"numero_lote": "1", "itens": [{"numero_item": "1", "descricao": "Abraçadeira", "quantidade": 100.0, "unidade_medida": "UN", "valor_unitario_estimado": 2.50, "valor_total_estimado": 250.0}]}]}'
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
        
        completion = client.chat.completions.create(
            model="gpt-4o", # Full GPT-4o for best vision quality
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        raw_json = completion.choices[0].message.content
        logger.info(f"Vision OCR Raw JSON: {raw_json[:500]}...")
        
        # Clean markdown if present
        raw_json = raw_json.strip()
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]
        raw_json = raw_json.strip()
        
        try:
            return ExtracaoEdital.model_validate_json(raw_json)
        except Exception as e_parse:
            logger.error(f"Failed to strictly parse Vision JSON: {e_parse}. Returning raw dict wrap.")
            import json
            parsed_dict = json.loads(raw_json)
            # Create a manual wrap
            lotes = []
            if "lotes" in parsed_dict:
                for l in parsed_dict["lotes"]:
                    itens = []
                    if "itens" in l:
                        for it in l["itens"]:
                            itens.append(ItemExtracted(
                                numero_item=str(it.get("numero_item")) if it.get("numero_item") else None,
                                descricao=str(it.get("descricao", "Item sem nome")),
                                quantidade=safe_float(it.get("quantidade")),
                                unidade_medida=str(it.get("unidade_medida")) if it.get("unidade_medida") else None,
                                valor_unitario_estimado=safe_float(it.get("valor_unitario_estimado")),
                                valor_total_estimado=safe_float(it.get("valor_total_estimado"))
                            ))
                    lotes.append(LoteExtracted(numero_lote=str(l.get("numero_lote")) if l.get("numero_lote") else None, itens=itens))
            return ExtracaoEdital(documento_valido=parsed_dict.get("documento_valido", True), lotes=lotes)
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
            "Atue como um extrator de dados de alta tolerância a falhas. Leia o texto e extraia qualquer tabela, lista ou grupo de serviços/produtos com valores.\n"
            "Preencha Descrição, Quantidade, Unidade, Valor Unitário e Número do Item. Se algum campo faltar, deixe-o em nulo/null (não invente dados).\n"
            "Sua regra de ouro é: se houver UM item válido (produto, quantidade e preço), documento_valido=true.\n"
            "Retorne APENAS UM JSON válido com a seguinte estrutura estrita: \n"
            '{"documento_valido": true, "lotes": [{"numero_lote": "1", "itens": [{"numero_item": "1", "descricao": "Abraçadeira", "quantidade": 100.0, "unidade_medida": "UN", "valor_unitario_estimado": 2.50, "valor_total_estimado": 250.0}]}]}'
        )
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extraia os itens:\n\n{truncated_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        raw_json = completion.choices[0].message.content
        logger.info(f"Text OCR Raw JSON: {raw_json[:500]}...")
        
        # Clean markdown if present
        raw_json = raw_json.strip()
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]
        raw_json = raw_json.strip()

        try:
            return ExtracaoEdital.model_validate_json(raw_json)
        except Exception as e_parse:
            logger.error(f"Failed to strictly parse Text JSON: {e_parse}. Returning raw dict wrap.")
            import json
            parsed_dict = json.loads(raw_json)
            lotes = []
            if "lotes" in parsed_dict:
                for l in parsed_dict["lotes"]:
                    itens = []
                    if "itens" in l:
                        for it in l["itens"]:
                            itens.append(ItemExtracted(
                                numero_item=str(it.get("numero_item")) if it.get("numero_item") else None,
                                descricao=str(it.get("descricao", "Item sem nome")),
                                quantidade=safe_float(it.get("quantidade")),
                                unidade_medida=str(it.get("unidade_medida")) if it.get("unidade_medida") else None,
                                valor_unitario_estimado=safe_float(it.get("valor_unitario_estimado")),
                                valor_total_estimado=safe_float(it.get("valor_total_estimado"))
                            ))
                    lotes.append(LoteExtracted(numero_lote=str(l.get("numero_lote")) if l.get("numero_lote") else None, itens=itens))
            return ExtracaoEdital(documento_valido=parsed_dict.get("documento_valido", True), lotes=lotes)
    except Exception as e:
        logger.error(f"Text-based extraction failed: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])
