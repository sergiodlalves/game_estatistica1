from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Jogador


@receiver(post_save, sender=User)
def create_jogador_profile(sender, instance, created, **kwargs):
    """
    Signal para criar automaticamente um perfil de Jogador quando
    um novo usuário é registrado no sistema.
    """
    if created:  # Apenas quando o usuário é criado pela primeira vez
        Jogador.objects.create(user_jogador=instance)
