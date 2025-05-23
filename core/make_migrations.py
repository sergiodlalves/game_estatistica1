# Este é um script auxiliar para executar as migrações do Django após atualizar os modelos
import os
import sys
import subprocess

def run_migrations():
    """
    Executa os comandos de migração do Django
    """
    print("Executando makemigrations para atualizar modelos...")
    
    # Comando para gerar as migrações
    make_result = subprocess.run(
        [sys.executable, 'manage.py', 'makemigrations'],
        capture_output=True,
        text=True
    )
    
    print(make_result.stdout)
    if make_result.stderr:
        print("ERRO:", make_result.stderr)
    
    print("\nExecutando migrate para aplicar as alterações...")
    
    # Comando para aplicar as migrações
    migrate_result = subprocess.run(
        [sys.executable, 'manage.py', 'migrate'],
        capture_output=True,
        text=True
    )
    
    print(migrate_result.stdout)
    if migrate_result.stderr:
        print("ERRO:", migrate_result.stderr)
    
    print("\nMigrações concluídas.")

if __name__ == "__main__":
    run_migrations()
