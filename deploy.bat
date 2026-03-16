echo ==============================================
echo 1. VERIFICANDO LOGIN NO DOCKER HUB
echo ==============================================
docker login
echo.
echo Se o login falhou mas voce ja esta logado no Docker Desktop (app), 
echo o processo pode funcionar mesmo assim.
echo.

echo.
echo ==============================================
echo 2. CONSTRUINDO E ENVIANDO FRONTEND
echo ==============================================
docker buildx build --platform linux/amd64 -t jhonatangabrielpro/licitia-v29-debug:latest -f Dockerfile.frontend .
if errorlevel 1 (
    echo Erro ao construir frontend. Abortando.
    pause
    exit /b %errorlevel%
)
docker push jhonatangabrielpro/licitia-v29-debug:latest

echo.
echo ==============================================
echo 3. CONSTRUINDO E ENVIANDO BACKEND
echo ==============================================
docker buildx build --platform linux/amd64 -t jhonatangabrielpro/licitia-backend:latest -f Dockerfile.backend .
if errorlevel 1 (
    echo Erro ao construir backend. Abortando.
    pause
    exit /b %errorlevel%
)
docker push jhonatangabrielpro/licitia-backend:latest

echo.
echo ==============================================
echo TUDO CONCLUIDO COM SUCESSO!
echo ==============================================
echo Agora, vá no site do Portainer:
echo 1. Abra o seu environment
echo 2. Va em Stacks e edite a sua stack (ou crie uma nova)
echo 3. Cole o conteudo novo do arquivo docker-compose.yml 
echo 4. Clique em "Update the stack"
pause
