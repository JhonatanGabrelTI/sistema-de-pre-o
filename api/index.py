import sys
import os

# Adiciona o diretório da API ao path para garantir que pacotes internos sejam encontrados
api_dir = os.path.dirname(__file__)
if api_dir not in sys.path:
    sys.path.append(api_dir)

from app.main import app as handler

# Export standard 'app' object for Vercel
app = handler
