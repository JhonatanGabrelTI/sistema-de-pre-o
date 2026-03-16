import re
import io
import os
import logging
from typing import List, Tuple, Optional, Any
from pydantic import BaseModel, Field
from openai import OpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

class ItemExtracted(BaseModel):
    numero_item: Optional[str] = Field(None, description="Número abstrato do item, se houver")
    descricao: str = Field(..., description="Nome do produto ou serviço (se não encontrar texto limpo, coloque o bloco inteiro)")
    quantidade: Optional[Any] = Field(None, description="Quantidade do produto")
    unidade_medida: Optional[str] = Field(None, description="Unidade de medida")
    valor_unitario_estimado: Optional[Any] = Field(None, description="Valor unitário estimado ou máximo aceito")
    valor_total_estimado: Optional[Any] = Field(None, description="Valor total estimado")

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

    return ""

def parse_products_from_text(raw_text: str, pages_config: str = None) -> ExtracaoEdital:
    """Parse product list from extracted PDF text using OpenAI LLM."""
    settings = get_settings()
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        logger.error("ERRO: OPENAI_API_KEY não encontrada nas configurações!")
        return ExtracaoEdital(documento_valido=False, lotes=[])

    # Truncate to avoid token limits
    truncated_text = raw_text[:30000]
    logger.info(f"Enviando para OpenAI {len(truncated_text)} caracteres. Primeiros 500: {truncated_text[:500]}")
    
    try:
        client = OpenAI(api_key=api_key, max_retries=0)
        system_prompt = (
            "Atue como um extrator de dados de alta precisão. Sua tarefa é ler o texto de um edital ou lista de compras e extrair os produtos/serviços.\n"
            "REGRAS CRÍTICAS:\n"
            "1. Extraia o máximo de itens possível.\n"
            "2. Para cada item, identifique: Descrição, Quantidade, Unidade (Ex: UN, KG, PCT), Valor Unitário e Número do Item.\n"
            "3. Se o texto for confuso, use o bom senso para separar o nome do produto da descrição técnica.\n"
            "4. Se encontrar QUALQUER produto, defina 'documento_valido' como true.\n"
            "5. Se 'quantidade' ou 'valor' não forem números claros (como 'A combinar' ou 'Ver anexo'), deixe-os como null em vez de colocar zero ou inventar.\n"
            "Retorne APENAS o JSON no formato:\n"
            '{"documento_valido": true, "lotes": [{"numero_lote": "1", "itens": [{"numero_item": "1", "descricao": "Papel A4", "quantidade": 10.0, "unidade_medida": "CX", "valor_unitario_estimado": 25.50}]}]}'
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
        logger.info(f"OpenAI Full Response: {raw_json}")
        
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
def parse_products_heuristic(file_bytes: bytes, pages_config: str = None) -> ExtracaoEdital:
    """Extração 'grátis' usando tabelas nativas do pdfplumber sem IA."""
    import pdfplumber
    logger.info("Iniciando extração heurística (Free Mode)...")
    itens = []
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            selected_indices = parse_page_ranges(pages_config, len(pdf.pages))
            for idx in selected_indices:
                page = pdf.pages[idx]
                tables = page.extract_tables()
                
                for table in tables:
                    if not table or len(table) < 2: continue # Precisa de cabeçalho + 1 linha
                    
                    # Identifica colunas
                    header = [str(c).lower() if c else "" for c in table[0]]
                    desc_idx = -1
                    qty_idx = -1
                    price_idx = -1
                    item_idx = -1
                    und_idx = -1
                    
                    for i, col in enumerate(header):
                        if any(k in col for k in ["descri", "objeto", "produto", "especif"]): desc_idx = i
                        elif any(k in col for k in ["qtd", "quant", "unid"]): # Unid as fallback for qty in some contexts
                            if "unid" in col and und_idx == -1: und_idx = i
                            else: qty_idx = i
                        elif any(k in col for k in ["valor", "preço", "unit", "estimado"]): price_idx = i
                        elif any(k in col for k in ["item", "lote", "pos"]): item_idx = i
                        elif "und" in col or "unidade" in col: und_idx = i

                    # Se não achou descrição, não é uma tabela de produtos útil
                    if desc_idx == -1: continue
                    
                    # Processa linhas (pula o cabeçalho)
                    for row in table[1:]:
                        if not row or len(row) <= desc_idx: continue
                        desc = str(row[desc_idx]).strip() if row[desc_idx] else ""
                        if not desc or len(desc) < 3: continue
                        
                        qty = safe_float(row[qty_idx]) if qty_idx != -1 and row[qty_idx] else 1.0
                        price = safe_float(row[price_idx]) if price_idx != -1 and row[price_idx] else 0.0
                        num_item = str(row[item_idx]).strip() if item_idx != -1 and row[item_idx] else None
                        und = str(row[und_idx]).strip() if und_idx != -1 and row[und_idx] else "UN"
                        
                        itens.append(ItemExtracted(
                            numero_item=num_item,
                            descricao=desc,
                            quantidade=qty,
                            unidade_medida=und,
                            valor_unitario_estimado=price,
                            valor_total_estimado=(qty or 1) * (price or 0)
                        ))
        
        logger.info(f"Heurística encontrou {len(itens)} itens.")
        return ExtracaoEdital(documento_valido=len(itens) > 0, lotes=[LoteExtracted(numero_lote="1", itens=itens)])
        
    except Exception as e:
        logger.error(f"Heuristic extraction failed: {e}")
        return ExtracaoEdital(documento_valido=False, lotes=[])
