from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('user', 'Utente'),
        ('escort', 'Escort'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='user')
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
