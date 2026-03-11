import sys
import os

# Adiciona o diretório atual ao path para que o import da 'app' funcione localmente
sys.path.append(os.path.dirname(__file__))

from app.main import app
