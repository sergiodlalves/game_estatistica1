import pandas as pd
import os
from django.db import transaction
from core.models import Pergunta, Resposta


def run():
    file_path = 'scripts/game_perguntas_respostas.xlsx'
    if not os.path.exists(file_path):
        print(f"Arquivo {file_path} não encontrado!")
        return

    # Contadores para relatório
    perguntas_criadas = 0
    perguntas_atualizadas = 0
    respostas_criadas = 0
    respostas_atualizadas = 0
    respostas_falhas = 0

    # Lendo as planilhas do Excel
    try:
        perguntas_df = pd.read_excel(file_path, sheet_name='Pergunta')
        respostas_df = pd.read_excel(file_path, sheet_name='Resposta')
    except Exception as e:
        print(f"Erro ao ler o arquivo Excel: {str(e)}")
        return

    # Utilizando uma transação para garantir a consistência dos dados
    with transaction.atomic():
        # Processando perguntas
        print("Iniciando importação de perguntas...")
        try:
            for index, row in perguntas_df.iterrows():
                try:
                    codigo = row['codigo']
                    # Verificamos se a pergunta já existe pelo código
                    pergunta, created = Pergunta.objects.update_or_create(
                        codigo=codigo,
                        defaults={
                            'text': row['text'],
                            'category': row['category'],
                            'posicao_tabuleiro': row['posicao_tabuleiro'],
                            'dica': row.get('dica', None),
                            'explicacao': row.get('explicacao', None)
                        }
                    )
                    if created:
                        perguntas_criadas += 1
                        print(f"Pergunta {codigo} criada com sucesso.")
                    else:
                        perguntas_atualizadas += 1
                        print(f"Pergunta {codigo} atualizada com sucesso.")
                except Exception as e:
                    print(f"Erro ao processar pergunta na linha {index + 2}: {str(e)}")
        except Exception as e:
            print(f"Erro geral ao processar perguntas: {str(e)}")

        # Processando respostas com o novo formato de código
        print("\nIniciando importação de respostas...")
        try:
            for index, row in respostas_df.iterrows():
                try:
                    # Obter o código da resposta completo (no formato R00101)
                    codigo_resposta = row['codigo']

                    # Extrair o código da pergunta correspondente (P001 a partir de R00101)
                    if len(codigo_resposta) >= 5 and codigo_resposta.startswith('R'):
                        codigo_pergunta = 'P' + codigo_resposta[1:4]
                    else:
                        print(f"Código de resposta inválido: {codigo_resposta} na linha {index + 2}")
                        respostas_falhas += 1
                        continue

                    # Verificar se a pergunta existe
                    try:
                        pergunta = Pergunta.objects.get(codigo=codigo_pergunta)
                    except Pergunta.DoesNotExist:
                        print(f"Pergunta com código {codigo_pergunta} não encontrada para a resposta {codigo_resposta}")
                        respostas_falhas += 1
                        continue

                    # Verificar se é resposta correta
                    e_correto = bool(row.get('e_correto', False))

                    # Criar ou atualizar a resposta com o código completo
                    resposta, created = Resposta.objects.update_or_create(
                        codigo=codigo_resposta,
                        pergunta=pergunta,
                        defaults={
                            'text': row['text'],
                            'e_correto': e_correto
                        }
                    )

                    if created:
                        respostas_criadas += 1
                        print(f"Resposta {codigo_resposta} para pergunta {codigo_pergunta} criada com sucesso.")
                    else:
                        respostas_atualizadas += 1
                        print(f"Resposta {codigo_resposta} para pergunta {codigo_pergunta} atualizada com sucesso.")
                except Exception as e:
                    print(f"Erro ao processar resposta na linha {index + 2}: {str(e)}")
                    respostas_falhas += 1
        except Exception as e:
            print(f"Erro geral ao processar respostas: {str(e)}")

    # Exibindo relatório final
    print("\n---------- RELATÓRIO DE IMPORTAÇÃO ----------")
    print(f"Perguntas criadas: {perguntas_criadas}")
    print(f"Perguntas atualizadas: {perguntas_atualizadas}")
    print(f"Respostas criadas: {respostas_criadas}")
    print(f"Respostas atualizadas: {respostas_atualizadas}")
    print(f"Falhas em respostas: {respostas_falhas}")
    print("--------------------------------------------")
