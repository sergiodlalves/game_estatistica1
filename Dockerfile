# Usa uma imagem oficial do Python
FROM python:3.12-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY requirements.txt .

# Instala as dependências e pacotes necessários para PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && pip install --upgrade pip \
    && pip install -r requirements.txt \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copia o restante do projeto para o container
COPY . .

# Coleta os arquivos estáticos
RUN python manage.py collectstatic --noinput

# Expõe a porta padrão do Railway
EXPOSE 8080

# Comando para executar migrações e iniciar o servidor Gunicorn
CMD python manage.py migrate && gunicorn game_estatistica.wsgi:application --bind 0.0.0.0:8080