import os
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import RegexValidator
from imagekit.models import ProcessedImageField
from imagekit.processors import ResizeToFit
from django.core.exceptions import ValidationError


def validate_image(value):
    file_extension = os.path.splitext(value.name)[1].lower()
    if file_extension not in ['.jpg', '.jpeg', '.png', '.gif']:
        raise ValidationError('Formato de arquivo não suportado. Use JPG, PNG ou GIF.')


class Jogador(models.Model):
    """
    Campos necessários do jogador para o jogo
    """
    user_jogador = models.OneToOneField(User, verbose_name='Usuário', on_delete=models.CASCADE, db_index=True, )
    jogos_jogados = models.IntegerField(default=0)
    vitorias = models.IntegerField(default=0)
    pontuacao_media = models.FloatField(default=0.0)
    maior_pontuacao = models.IntegerField(default=0)  # Nova estatística
    tempo_medio_jogo = models.IntegerField(default=0)  # Em segundos
    total_perguntas_certas = models.IntegerField(default=0)  # Total de perguntas certas

    def __str__(self):
        return self.user_jogador.username

    class Meta:
        verbose_name = 'Jogador'
        verbose_name_plural = 'Jogadores'
        ordering = ['-jogos_jogados']


class Game(models.Model):
    """
    Modelo para armazenar informações sobre cada partida do jogo
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'Em andamento'),
        ('COMPLETED', 'Finalizado'),
        ('CANCELLED', 'Cancelado'),
    ]

    partidas = models.ManyToManyField(User, related_name='jogos_partidas')
    inicio_tempo = models.DateTimeField(default=timezone.now)
    fim_tempo = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS'
    )
    ganhador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jogos_ganhos'
    )

    def __str__(self):
        return f"Jogo {self.id} - {self.status}"


class PontuacaoJogo(models.Model):
    """
    Modelo para armazenar a pontuação de cada jogador em uma partida
    """
    jogo = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='pontuacoes_jogo')
    jogador = models.ForeignKey(User, on_delete=models.CASCADE)
    pontuacao = models.IntegerField(default=0)

    class Meta:
        unique_together = ['jogo', 'jogador']

    def __str__(self):
        return f"{self.jogador.username} - Score: {self.pontuacao}"


class Pergunta(models.Model):
    CATEGORY_CHOICES = [
        ('BASICA', 'Estatística Básica'),
        ('TENDENCIA', 'Tendência Central'),
        ('PROBABILIDADE', 'Probabilidade'),
        ('GRAFICA', 'Análise Gráfica'),
        ('CORRELACAO', 'Correlação'),
        ('DISPERSAO', 'Dispersão'),
        # Adicione outras categorias conforme necessário
    ]
    codigo = models.CharField(
        verbose_name="Código Pergunta",
        max_length=4,
        unique=True,
        default='0000',
        help_text="Código único no formato P000 (ex: P001, P002)",
        validators=[
            RegexValidator(regex=r'^P\d{3}$',
                           message='O código deve estar no formato P seguido de 3 números (ex: P001)',
                           code='invalid_codigo'
                           )
            ],
        )

    text = models.TextField(verbose_name="Pergunta")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    posicao_tabuleiro = models.PositiveIntegerField(
        verbose_name="Casa do Tabuleiro",
        help_text="Número da casa do tabuleiro associada a esta pergunta"
    )
    dica = models.TextField(
        verbose_name="Dica",
        blank=True,
        null=True,
        help_text="Dica opcional que pode ser mostrada ao jogador (com penalidade de pontos)"
    )
    explicacao = models.TextField(
        verbose_name="Explicação",
        blank=True,
        null=True,
        help_text="Explicação detalhada da resposta para mostrar após o jogador responder"
    )
    imagem = ProcessedImageField(
        upload_to='perguntas/',
        processors=[ResizeToFit(800, 600)],  # Largura e altura máximas
        format='JPEG',
        options={'quality': 85},  # Qualidade de compressão
        blank=True,
        null=True,
        help_text="Imagem opcional para ilustrar a pergunta",
        validators=[validate_image],
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Casa {self.posicao_tabuleiro}: {self.text[:50]}"

    class Meta:
        verbose_name = "Pergunta"
        verbose_name_plural = "Perguntas"
        ordering = ['posicao_tabuleiro', 'category']

class Resposta(models.Model):
    codigo = models.CharField(
        verbose_name="Código Resposta",
        max_length=6,
        default='000000',
        validators=[
            RegexValidator(
                regex=r'^R\d{3}\d{2}$',
                message='O código deve estar no formato R seguido de 5 números (ex: R00101)',
                code='invalid_codigo'
            )
        ],

    )
    pergunta = models.ForeignKey(Pergunta, related_name='respostas', on_delete=models.CASCADE)
    text = models.CharField(max_length=255, verbose_name="Resposta")
    e_correto = models.BooleanField(default=False)

    class Meta:
        unique_together = ['codigo', 'pergunta']

    def save(self, *args, **kwargs):
        # Verifica se o código está no formato padrão
        if self.codigo == '0000' and self.pergunta:
            # Conta quantas respostas a pergunta já tem
            count = Resposta.objects.filter(pergunta=self.pergunta).count()
            # Gera um código baseado no código da pergunta (P001 -> R001, R002...)
            self.codigo = f"R{count + 1:03d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.text} ({'Correta' if self.e_correto else 'Errada'})"
