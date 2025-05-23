from django.contrib import admin
from django.utils.html import format_html
from .models import Jogador, Game, PontuacaoJogo, Pergunta, Resposta

@admin.register(Jogador)
class JogadorAdmin(admin.ModelAdmin):
    list_display = ('user_jogador', 'jogos_jogados', 'vitorias', 'pontuacao_media')
    list_filter = ('jogos_jogados', 'vitorias')
    search_fields = ('user_jogador__username',)
    ordering = ('-jogos_jogados',)

class PontuacaoJogoInline(admin.TabularInline):
    model = PontuacaoJogo
    extra = 0
    readonly_fields = ('jogador', 'pontuacao')

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'inicio_tempo', 'fim_tempo', 'ganhador')
    list_filter = ('status', 'inicio_tempo')
    search_fields = ('ganhador__username',)
    readonly_fields = ('inicio_tempo',)
    filter_horizontal = ('partidas',)
    inlines = [PontuacaoJogoInline]

@admin.register(PontuacaoJogo)
class PontuacaoJogoAdmin(admin.ModelAdmin):
    list_display = ('jogo', 'jogador', 'pontuacao')
    list_filter = ('jogo', 'jogador')
    search_fields = ('jogador__username',)

class RespostaInline(admin.TabularInline):
    model = Resposta
    extra = 1
    fields = ('codigo', 'text', 'e_correto')

@admin.register(Pergunta)
class PerguntaAdmin(admin.ModelAdmin):
    list_display = ('posicao_tabuleiro', 'category', 'text_truncated', 'tem_dica', 'tem_explicacao', 'imagem_thumbnail',
'criado_em')
    list_filter = ('category', 'criado_em')
    search_fields = ('text',)
    inlines = [RespostaInline]
    ordering = ('posicao_tabuleiro',)
    fieldsets = (
        (None, {
            'fields': ('posicao_tabuleiro', 'category', 'text')
        }),
        ('Recursos adicionais', {
            'fields': ('dica', 'explicacao', 'imagem'),
            'classes': ('collapse',),
            'description': 'Recursos opcionais para enriquecer a pergunta'
        }),
    )

    def text_truncated(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_truncated.short_description = 'Pergunta'
    
    def tem_dica(self, obj):
        return bool(obj.dica)
    tem_dica.short_description = 'Dica'
    tem_dica.boolean = True
    
    def tem_explicacao(self, obj):
        return bool(obj.explicacao)
    tem_explicacao.short_description = 'Explicação'
    tem_explicacao.boolean = True

    def imagem_thumbnail(self, obj):
        if obj.imagem:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.imagem.url)
        return "Sem imagem"

    imagem_thumbnail.short_description = 'Imagem'


@admin.register(Resposta)
class RespostaAdmin(admin.ModelAdmin):
    list_display = ('pergunta_text', 'text', 'e_correto')
    list_filter = ('e_correto', 'pergunta__category')
    search_fields = ('text', 'pergunta__text')

    def pergunta_text(self, obj):
        return obj.pergunta.text[:50] + '...' if len(obj.pergunta.text) > 50 else obj.pergunta.text
    pergunta_text.short_description = 'Pergunta'
