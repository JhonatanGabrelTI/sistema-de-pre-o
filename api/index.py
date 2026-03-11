import sys
import os

# Adiciona o diretório atual ao path para que o import da 'app' funcione localmente
sys.path.append(os.path.dirname(__file__))

from app.main import app as handler # Vercel uses the exported object

app = handler # Export as 'app' as well just in case
