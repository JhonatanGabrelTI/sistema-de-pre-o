
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    print("Testing imports...")
    import pdfplumber
    import pypdf
    from app.services.pdf_service import extract_text_from_pdf, parse_products_from_text
    print("Imports OK.")

    print("Testing dummy PDF extraction...")
    dummy_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000111 00000 n\n0000000190 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n284\n%%EOF"
    text = extract_text_from_pdf(dummy_content)
    print(f"Extracted text: {text}")

    print("Testing OpenAI Parse (Dry Run - checking model definition)...")
    # Just checking if the classes are defined correctly
    from app.services.pdf_service import ExtracaoEdital
    print("ExtracaoEdital schema OK.")

    print("Success: Backend logic seems sound.")
except Exception as e:
    print(f"Error during diagnostic: {e}")
    import traceback
    traceback.print_exc()
