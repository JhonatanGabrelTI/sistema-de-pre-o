import re
import io
import logging
from typing import List, Tuple

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


def parse_products_from_text(raw_text: str) -> List[Tuple[str, int]]:
    """Parse product list from extracted PDF text.
    
    Attempts to identify product names and quantities using common patterns.
    Returns list of (product_name, quantity) tuples.
    """
    products = []
    lines = raw_text.split("\n")

    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue

        # Skip header-like lines
        if any(kw in line.lower() for kw in ["total", "subtotal", "desconto", "frete", "imposto", "---", "===", "página"]):
            continue

        # Pattern: quantity at beginning — "2x Produto" or "2 - Produto" or "2 un Produto"
        match = re.match(r'^(\d+)\s*[xX×\-–—]?\s*(?:un\.?|und\.?|pç\.?|pc\.?)?\s+(.+)', line)
        if match:
            qty = int(match.group(1))
            name = match.group(2).strip()
            if qty > 0 and len(name) > 2:
                products.append((name, qty))
                continue

        # Pattern: quantity at end — "Produto ... 2"
        match = re.match(r'^(.+?)\s+(\d+)\s*(?:un\.?|und\.?|pç\.?|pc\.?)?\s*$', line)
        if match:
            name = match.group(1).strip()
            qty = int(match.group(2))
            if qty > 0 and qty < 10000 and len(name) > 2:
                products.append((name, qty))
                continue

        # Pattern: tabular — "Item | Produto | Qty" or similar with tabs/multiple spaces
        parts = re.split(r'\t+|\s{2,}', line)
        if len(parts) >= 2:
            # Try to find a number in the parts
            for i, part in enumerate(parts):
                part = part.strip()
                if part.isdigit() and int(part) > 0 and int(part) < 10000:
                    name_parts = [p.strip() for j, p in enumerate(parts) if j != i and p.strip() and not p.strip().isdigit()]
                    if name_parts:
                        name = " ".join(name_parts)
                        if len(name) > 2:
                            products.append((name, int(part)))
                            break
            else:
                # No quantity found, assume 1
                name = line.strip()
                if len(name) > 3 and not name.isdigit():
                    products.append((name, 1))
                continue
            continue

        # Default: treat entire line as product with quantity 1
        if len(line) > 3 and not line.isdigit() and not re.match(r'^[\d\s\.\,]+$', line):
            products.append((line, 1))

    # Deduplicate
    seen = {}
    for name, qty in products:
        normalized = re.sub(r'\s+', ' ', name.lower().strip())
        if normalized in seen:
            seen[normalized] = (name, seen[normalized][1] + qty)
        else:
            seen[normalized] = (name, qty)

    return [(name, qty) for name, qty in seen.values()]
