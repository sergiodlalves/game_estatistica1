from django.urls import path
from .views import IndexTemplateView, TutorialTemplateView, TabuleiroTemplateView, EstatisticasJogadorView, RankingView


urlpatterns = [
    path('', IndexTemplateView.as_view(), name='index'),
    path('tutorial/', TutorialTemplateView.as_view(), name='tutorial'),
    path('tabuleiro/', TabuleiroTemplateView.as_view(), name='tabuleiro'),
    path('tabuleiro/<int:jogo_id>/', TabuleiroTemplateView.as_view(), name='tabuleiro_continue'),
    path('estatisticas/', EstatisticasJogadorView.as_view(), name='estatisticas_jogador'),
    path('ranking/', RankingView.as_view(), name='ranking'),
]
