from django.views.generic import TemplateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.http import JsonResponse
from .models import Game, PontuacaoJogo, Jogador, Pergunta, Resposta
import random
import datetime


# Página inicial para usuários não logados
class IndexTemplateView(TemplateView):
    template_name = 'index.html'


class TutorialTemplateView(TemplateView):
    template_name = 'tutorial.html'


class TabuleiroTemplateView(LoginRequiredMixin, TemplateView):
    """
    View para exibir o tabuleiro do jogo e gerenciar a partida.
    Apenas usuários logados podem acessar esta view.
    """
    template_name = 'tabuleiro.html'
    login_url = '/accounts/login/'  # URL para redirecionamento de usuários não logados

    def get(self, request, *args, **kwargs):
        jogo_id = kwargs.get('jogo_id')

        # ---------------------------------------------
        # 1) Se veio um ID, validar e renderizar
        # ---------------------------------------------
        if jogo_id:
            jogo = get_object_or_404(
                Game,
                id=jogo_id,
                partidas=request.user,
                status='IN_PROGRESS'
            )
            context = self.get_context_data(**kwargs)
            context.update({
                'jogo_id': jogo.id,
                'jogador_nome': request.user.username,
            })
            return render(request, self.template_name, context)

        # ---------------------------------------------
        # 2) Sem ID: verificar se já existe partida ativa
        # ---------------------------------------------
        partida_ativa = (
            Game.objects
            .filter(partidas=request.user, status='IN_PROGRESS')
            .first()
        )
        if partida_ativa:
            # só redireciona para a partida existente
            return redirect('tabuleiro_continue', jogo_id=partida_ativa.id)

        # ---------------------------------------------
        # 3) Nenhuma ativa → criar nova
        # ---------------------------------------------
        novo_jogo = Game.objects.create(
            status='IN_PROGRESS',
            inicio_tempo=timezone.now()
        )
        novo_jogo.partidas.add(request.user)

        PontuacaoJogo.objects.create(
            jogo=novo_jogo,
            jogador=request.user,
            pontuacao=0
        )

        return redirect('tabuleiro_continue', jogo_id=novo_jogo.id)

    def post(self, request, *args, **kwargs):
        """
        Endpoint para processar ações durante o jogo:
        - Atualizar pontuação (update_score)
        - Verificar status atual (check_status)
        - Cancelar partida (cancel_game)
        - Buscar pergunta para casa específica (get_pergunta)
        - Processar resposta a pergunta (responder_pergunta)
        """
        try:
            # Extrai dados do POST
            action = request.POST.get('action', 'update_score')
            jogo_id = request.POST.get('jogo_id')

            # Validar ID do jogo
            if not jogo_id:
                return JsonResponse({
                    'status': 'error',
                    'message': 'ID do jogo não fornecido.'
                }, status=400)

            # ========================================================
            # AÇÕES QUE NÃO REQUEREM BUSCAR O JOGO INICIALMENTE
            # ========================================================

            # 1. Ação: get_pergunta - Buscar pergunta para casa específica
            if action == 'get_pergunta':
                casa_id = request.POST.get('casa_id')
                if not casa_id:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'ID da casa não fornecido.'
                    }, status=400)
                return self._get_pergunta(request, jogo_id, casa_id)

            # 2. Ação: responder_pergunta - Processar resposta do usuário
            elif action == 'responder_pergunta':
                # Verifica se os dados necessários foram enviados
                resposta_id = request.POST.get('resposta_id')
                if not resposta_id:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'ID da resposta não fornecido.'
                    }, status=400)
                return self._processar_resposta(request, jogo_id)

            # ========================================================
            # AÇÕES QUE REQUEREM BUSCAR O JOGO
            # ========================================================

            # Busca o jogo no banco de dados
            try:
                jogo = Game.objects.get(id=jogo_id, partidas=request.user)
            except Game.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Jogo não encontrado.'
                }, status=404)

            # 3. Ação: cancel_game - Cancelar uma partida em andamento
            if action == 'cancel_game':
                return self._cancel_game(request, jogo)

            # 4. Ação: check_status - Verificar o status atual do jogo
            elif action == 'check_status':
                return self._check_game_status(request, jogo)

            # 5. Ação: update_score (default) - Atualizar pontuação do jogador
            else:
                # Verifica se o jogo está em andamento
                if jogo.status != 'IN_PROGRESS':
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Esta partida não está mais em andamento.'
                    }, status=400)

                # Extrai e valida os parâmetros
                try:
                    pontos = int(request.POST.get('pontos', 0))
                    casa_atual = int(request.POST.get('casa_atual', 0))
                    finalizar = request.POST.get('finalizar', 'false').lower() == 'true'
                except (ValueError, TypeError):
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Parâmetros inválidos.'
                    }, status=400)

                # Obtém e atualiza a pontuação
                try:
                    pontuacao_jogo = PontuacaoJogo.objects.get(jogo=jogo, jogador=request.user)
                    pontuacao_jogo.pontuacao += pontos
                    pontuacao_jogo.save()
                except PontuacaoJogo.DoesNotExist:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Pontuação do jogo não encontrada.'
                    }, status=404)

                # Se finalizar ou chegou ao final do tabuleiro
                if finalizar or casa_atual >= 21:
                    return self._complete_game(request, jogo, pontuacao_jogo)

                # Retorna a pontuação atualizada
                return JsonResponse({
                    'status': 'success',
                    'pontuacao_atual': pontuacao_jogo.pontuacao,
                    'jogo_id': jogo.id
                })

        except Exception as e:
            # Log do erro para debugging
            import traceback
            print(f"Erro no POST do tabuleiro: {str(e)}")
            print(traceback.format_exc())

            return JsonResponse({
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }, status=500)
    
    def _check_game_status(self, request, jogo):
        """
        Método para verificar o status atual do jogo
        """
        try:
            pontuacao_jogo = PontuacaoJogo.objects.get(jogo=jogo, jogador=request.user)
            
            return JsonResponse({
                'status': 'success',
                'jogo_status': jogo.status,
                'pontuacao_atual': pontuacao_jogo.pontuacao,
                'jogo_id': jogo.id
            })
        except PontuacaoJogo.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Pontuação do jogo não encontrada.'
            }, status=404)

    def _update_player_stats(self, jogador):
        """
        Atualiza estatísticas calculadas do jogador após uma partida.
        Considera apenas pontuações positivas para cálculos de estatísticas de pontuação.
        Inclui verificações detalhadas para o cálculo do tempo médio de jogo.
        """
        # Buscar todas as pontuações do jogador em jogos completados ou cancelados
        pontuacoes = PontuacaoJogo.objects.filter(
            jogador=jogador.user_jogador,
            jogo__status__in=['COMPLETED', 'CANCELLED']
        )

        # Filtrar apenas pontuações positivas para estatísticas de pontuação
        pontuacoes_positivas = [p.pontuacao for p in pontuacoes if p.pontuacao > 0]

        # Calcular pontuação média apenas com pontuações positivas
        if pontuacoes_positivas:
            jogador.pontuacao_media = sum(pontuacoes_positivas) / len(pontuacoes_positivas)
            jogador.maior_pontuacao = max(pontuacoes_positivas)
        else:
            jogador.pontuacao_media = 0
            jogador.maior_pontuacao = 0

        # Calcular tempo médio de jogo - consulta os jogos diretamente
        jogos_com_tempo = Game.objects.filter(
            partidas=jogador.user_jogador,
            status__in=['COMPLETED', 'CANCELLED']
        ).exclude(
            inicio_tempo__isnull=True
        ).exclude(
            fim_tempo__isnull=True
        )

        if jogos_com_tempo.exists():
            jogos_validos = 0
            total_segundos = 0

            for jogo in jogos_com_tempo:
                # Verificação para garantir que os tempos são válidos
                if jogo.inicio_tempo and jogo.fim_tempo:
                    duracao = jogo.fim_tempo - jogo.inicio_tempo
                    segundos = duracao.total_seconds()

                    # Verifica se a duração é positiva
                    if segundos > 0:
                        total_segundos += segundos
                        jogos_validos += 1

            # Calcula o tempo médio apenas se existirem jogos válidos
            if jogos_validos > 0:
                jogador.tempo_medio_jogo = int(total_segundos / jogos_validos)

        # Salvar as alterações
        jogador.save()

    def _complete_game(self, request, jogo, pontuacao_jogo):
        """
        Método auxiliar para finalizar um jogo completado com sucesso.
        Um jogo só é considerado vitória se a pontuação final for maior que zero.
        """
        # Atualiza o status do jogo para completo
        jogo.status = 'COMPLETED'
        jogo.fim_tempo = timezone.now()

        # Define o ganhador apenas se a pontuação for maior que zero
        if pontuacao_jogo.pontuacao > 0:
            jogo.ganhador = request.user
        else:
            # Se pontuação for zero ou negativa, não registra ganhador
            jogo.ganhador = None

        # Salva as alterações no jogo
        jogo.save()

        # Atualiza as estatísticas do jogador
        jogador, created = Jogador.objects.get_or_create(user_jogador=request.user)

        # Sempre incrementa o contador de jogos jogados
        jogador.jogos_jogados += 1

        # Verifica se foi uma vitória (pontuação > 0)
        e_vitoria = pontuacao_jogo.pontuacao > 0
        if e_vitoria:
            jogador.vitorias += 1
            mensagem = 'Parabéns! Você completou o jogo com sucesso!'
        else:
            mensagem = 'Jogo finalizado, mas sem pontuação suficiente para vitória.'

        # Recalcula a pontuação média
        self._update_player_stats(jogador)

        # Preparar informações adicionais para a resposta
        tempo_jogo = None
        tempo_formatado = None
        if jogo.inicio_tempo and jogo.fim_tempo:
            # Calcular duração do jogo em segundos
            duracao = jogo.fim_tempo - jogo.inicio_tempo
            tempo_jogo = int(duracao.total_seconds())
            tempo_formatado = str(datetime.timedelta(seconds=tempo_jogo))

        # Retorna o resultado para o cliente
        return JsonResponse({
            'status': 'success',
            'message': mensagem,
            'pontuacao_final': pontuacao_jogo.pontuacao,
            'e_vitoria': e_vitoria,
            'tempo_jogo': tempo_jogo,
            'tempo_formatado': tempo_formatado,
            'jogos_completados': jogador.jogos_jogados,
            'vitorias': jogador.vitorias,
            'redirect_url': reverse('index')
        })

    def _cancel_game(self, request, jogo):
        """
        Método auxiliar para cancelar um jogo abandonado
        """
        # Só permite cancelar jogos que estão em andamento
        if jogo.status != 'IN_PROGRESS':
            return JsonResponse({
                'status': 'error',
                'message': 'Esta partida não pode ser cancelada.'
            }, status=400)

        jogo.status = 'CANCELLED'
        jogo.fim_tempo = timezone.now()
        jogo.save()

        # Atualiza as estatísticas do jogador
        jogador, created = Jogador.objects.get_or_create(user_jogador=request.user)
        jogador.jogos_jogados += 1  # Incrementa jogos jogados, mesmo que tenha desistido

        # Recalcula a pontuação média (não incrementa vitórias)
        self._update_player_stats(jogador)

        return JsonResponse({
            'status': 'success',
            'message': 'Partida cancelada.',
            'redirect_url': reverse('index')
        })

    # Adicionar estes métodos à classe TabuleiroTemplateView
    def _get_pergunta(self, request, jogo_id, casa_id):
        """
        Método para buscar uma pergunta aleatória para uma casa específica
        e retornar os dados em formato JSON
        """
        try:
            # Verificar se o jogo existe e está em andamento
            jogo = get_object_or_404(Game, id=jogo_id, partidas=request.user, status='IN_PROGRESS')

            # Buscar perguntas para esta casa
            perguntas = Pergunta.objects.filter(posicao_tabuleiro=casa_id)

            # Se não houver perguntas para esta casa
            if not perguntas.exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Não há perguntas para esta casa'
                })

            # Selecionar uma pergunta aleatória
            pergunta = random.choice(perguntas)

            # Buscar as respostas para esta pergunta
            respostas = Resposta.objects.filter(pergunta=pergunta)
            respostas_json = []

            # Formatar respostas para JSON (sem revelar qual é a correta)
            for resp in respostas:
                respostas_json.append({
                    'id': resp.id,
                    'text': resp.text
                })

            # Salvar na sessão a pergunta atual para validação posterior
            request.session['pergunta_atual_id'] = pergunta.id

            # Retornar dados da pergunta
            return JsonResponse({
                'status': 'success',
                'pergunta': {
                    'id': pergunta.id,
                    'text': pergunta.text,
                    'category': pergunta.get_category_display(),
                    'dica': pergunta.dica,
                    'imagem_url': pergunta.imagem.url if pergunta.imagem else None
                },
                'respostas': respostas_json,
                'casa_id': casa_id
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': f'Erro ao buscar pergunta: {str(e)}'
            }, status=500)

    def _processar_resposta(self, request, jogo_id):
        """
        Método para processar a resposta selecionada pelo usuário
        e retornar feedback em formato JSON
        """
        try:
            # Verificar se o jogo existe
            jogo = get_object_or_404(Game, id=jogo_id, partidas=request.user)

            # Obter dados do formulário
            resposta_id = request.POST.get('resposta_id')
            pergunta_id = request.session.get('pergunta_atual_id')
            usou_dica = request.POST.get('usou_dica') == 'true'

            # Verificar se temos todos os dados necessários
            if not all([resposta_id, pergunta_id]):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Dados incompletos'
                }, status=400)

            # Buscar objetos necessários
            resposta = Resposta.objects.get(id=resposta_id)
            pergunta = Pergunta.objects.get(id=pergunta_id)
            pontuacao = PontuacaoJogo.objects.get(jogo=jogo, jogador=request.user)

            # Verificar se a resposta está correta
            if resposta.e_correto:
                # Pontuação base por acerto: 100 pontos
                pontos = 100

                # Se usou dica, reduzir 30 pontos
                if usou_dica:
                    pontos -= 30

                # Atualizar pontuação
                pontuacao.pontuacao += pontos
                pontuacao.save()

                # Atualizar contador de perguntas corretas
                jogador, created = Jogador.objects.get_or_create(user_jogador=request.user)
                jogador.total_perguntas_certas += 1
                jogador.save()

                # Resposta correta
                return JsonResponse({
                    'status': 'success',
                    'resposta_correta': True,
                    'pontos': pontos,
                    'pergunta': {
                        'text': pergunta.text,
                        'explicacao': pergunta.explicacao
                    },
                    'resposta': {
                        'text': resposta.text
                    },
                    'pontuacao_atual': pontuacao.pontuacao
                })
            else:
                # Resposta incorreta - penalidade
                penalidade = 20  # Penalidade por resposta errada: 20 pontos
                pontuacao.pontuacao -= penalidade
                pontuacao.save()

                # Buscar a resposta correta
                resposta_correta = Resposta.objects.get(pergunta=pergunta, e_correto=True)

                # Retornar feedback
                return JsonResponse({
                    'status': 'success',
                    'resposta_correta': False,
                    'penalidade': penalidade,
                    'pergunta': {
                        'text': pergunta.text,
                        'explicacao': pergunta.explicacao
                    },
                    'resposta_correta_obj': {
                        'text': resposta_correta.text
                    },
                    'pontuacao_atual': pontuacao.pontuacao
                })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': f'Erro ao processar resposta: {str(e)}'
            }, status=500)


class EstatisticasJogadorView(LoginRequiredMixin, DetailView):
    """
    View para exibir estatísticas detalhadas do jogador.
    Apenas usuários logados podem acessar esta view.
    """
    model = Jogador
    template_name = 'estatisticas_jogador.html'
    context_object_name = 'jogador'
    login_url = '/accounts/login/'

    def get_object(self, queryset=None):
        # Retorna o perfil do jogador do usuário atual
        jogador, created = Jogador.objects.get_or_create(user_jogador=self.request.user)
        return jogador

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        jogador = self.get_object()

        # Calculando estatísticas adicionais
        context['taxa_vitoria'] = (jogador.vitorias / jogador.jogos_jogados * 100) if jogador.jogos_jogados > 0 else 0

        # Formatar tempo médio
        if jogador.tempo_medio_jogo > 0:
            context['tempo_medio_formatado'] = str(datetime.timedelta(seconds=jogador.tempo_medio_jogo))
        else:
            context['tempo_medio_formatado'] = "00:00:00"

        # Média de perguntas corretas por jogo
        if jogador.jogos_jogados > 0:
            context['media_perguntas_certas'] = jogador.total_perguntas_certas / jogador.jogos_jogados
        else:
            context['media_perguntas_certas'] = 0

        # Obtendo partidas recentes
        partidas_recentes = Game.objects.filter(
            partidas=jogador.user_jogador
        ).order_by('-inicio_tempo')[:5]

        # Adicionando pontuações às partidas
        for partida in partidas_recentes:
            try:
                pontuacao = PontuacaoJogo.objects.get(jogo=partida, jogador=jogador.user_jogador)
                partida.pontuacao_obtida = pontuacao.pontuacao
            except PontuacaoJogo.DoesNotExist:
                partida.pontuacao_obtida = 0

        context['partidas_recentes'] = partidas_recentes

        # ➜ NOVO – calcular posição no ranking geral (por maior pontuação)
        ranking = (
            Jogador.objects
            .filter(jogos_jogados__gt=0)  # só quem jogou
            .order_by('-maior_pontuacao')  # critério do RankingView
            .values_list('id', flat=True)
        )
        try:
            posicao = list(ranking).index(jogador.id) + 1
        except ValueError:
            posicao = None  # ainda não ranqueado

        context['posicao_ranking'] = posicao

        return context


class RankingView(TemplateView):
    """
    View para exibir o ranking dos jogadores.
    Lista os jogadores ordenados por diferentes critérios de estatísticas.
    """
    template_name = 'ranking.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Definir o critério de ordenação (padrão: maior pontuação)
        order_by = self.request.GET.get('order_by', 'maior_pontuacao')
        
        # Definir direção da ordenação (padrão: decrescente)
        order_dir = self.request.GET.get('dir', 'desc')
        
        # Mapear critérios válidos de ordenação
        valid_order_fields = {
            'maior_pontuacao': 'maior_pontuacao',
            'pontuacao_media': 'pontuacao_media',
            'vitorias': 'vitorias',
            'jogos': 'jogos_jogados',
            'perguntas_certas': 'total_perguntas_certas'
        }
        
        # Verificar se o critério é válido, senão usar o padrão
        if order_by not in valid_order_fields:
            order_by = 'maior_pontuacao'
        
        # Construir string de ordenação
        order_field = valid_order_fields[order_by]
        if order_dir == 'asc':
            order_string = order_field
        else:
            order_string = f'-{order_field}'
        
        # Buscar apenas jogadores que tenham jogado pelo menos um jogo
        jogadores = Jogador.objects.filter(jogos_jogados__gt=0).order_by(order_string)[:20]
        
        # Adicionar posição no ranking
        for i, jogador in enumerate(jogadores):
            jogador.posicao = i + 1
            
            # Formatar tempo médio para exibição
            if jogador.tempo_medio_jogo > 0:
                jogador.tempo_formatado = str(datetime.timedelta(seconds=jogador.tempo_medio_jogo))
            else:
                jogador.tempo_formatado = "00:00:00"
            
            # Calcular taxa de vitória
            if jogador.jogos_jogados > 0:
                jogador.taxa_vitoria = (jogador.vitorias / jogador.jogos_jogados) * 100
            else:
                jogador.taxa_vitoria = 0
        
        context['jogadores'] = jogadores
        context['order_by'] = order_by
        context['order_dir'] = order_dir
        
        return context

# A classe CasaBonusTemplateView foi removida para simplificar o código
# O bônus agora é exibido diretamente no tabuleiro usando um modal
