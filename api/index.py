import sys
import os

# Adiciona o diretório backend ao path para que o import funcione
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Vercel espera um objeto 'app' no nível raiz do arquivo
# ou que o arquivo seja importado por ele.
