# core/management/commands/create_missing_jogadores.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Jogador


class Command(BaseCommand):
    help = 'Cria perfis de Jogador para usuários existentes que não possuem um'

    def handle(self, *args, **kwargs):
        # Encontra todos os usuários que não têm um jogador associado
        users_without_jogador = User.objects.exclude(
            id__in=Jogador.objects.values_list('user_jogador_id', flat=True)
        )

        count = 0
        for user in users_without_jogador:
            Jogador.objects.create(user_jogador=user)
            count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Criados {count} novos perfis de Jogador')
        )
        