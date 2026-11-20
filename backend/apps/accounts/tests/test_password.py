"""Cambio password dall'area personale e "ho dimenticato la password"."""

import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD = 'VecchiaPass!2024'
NUOVA = 'NuovaPassword!2025'


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://escort-bella.it',
)
class PasswordTestBase(TestCase):
    def setUp(self):
        cache.clear()  # azzera i contatori dei throttle
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='giulia@example.com', email='giulia@example.com',
            password=PASSWORD, user_type='escort', first_name='Giulia',
        )

    def login_ok(self, password):
        return APIClient().post('/api/auth/login/', {'email': self.user.email, 'password': password}, format='json').status_code == 200


class CambioPasswordTest(PasswordTestBase):
    url = '/api/auth/password/change/'

    def test_serve_essere_loggati(self):
        r = self.client.post(self.url, {}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_cambio_riuscito(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(self.url, {
            'old_password': PASSWORD, 'new_password': NUOVA, 'new_password_confirm': NUOVA,
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access_token', r.cookies)
        self.assertTrue(self.login_ok(NUOVA))
        self.assertFalse(self.login_ok(PASSWORD))

    def test_password_attuale_sbagliata(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(self.url, {
            'old_password': 'sbagliata', 'new_password': NUOVA, 'new_password_confirm': NUOVA,
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('attuale', r.json()['detail'])
        self.assertTrue(self.login_ok(PASSWORD))

    def test_conferma_diversa(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(self.url, {
            'old_password': PASSWORD, 'new_password': NUOVA, 'new_password_confirm': NUOVA + 'x',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('non corrispondono', r.json()['detail'])

    def test_password_troppo_debole(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(self.url, {
            'old_password': PASSWORD, 'new_password': '123', 'new_password_confirm': '123',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(self.login_ok(PASSWORD))


class PasswordDimenticataTest(PasswordTestBase):
    def richiedi(self, email):
        return self.client.post('/api/auth/password/reset/', {'email': email}, format='json')

    def link_dalla_mail(self):
        m = re.search(r'uid=([^&\s]+)&token=([^\s]+)', mail.outbox[-1].body)
        return m.group(1), m.group(2)

    def conferma(self, uid, token, password=NUOVA, conferma=None):
        return self.client.post('/api/auth/password/reset/confirm/', {
            'uid': uid, 'token': token, 'new_password': password,
            'new_password_confirm': conferma if conferma is not None else password,
        }, format='json')

    def test_invia_email_con_link(self):
        r = self.richiedi('Giulia@Example.com')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['giulia@example.com'])
        self.assertIn('https://escort-bella.it/reimposta-password?uid=', mail.outbox[0].body)

    def test_email_sconosciuta_stessa_risposta_nessuna_mail(self):
        r_ok = self.richiedi('giulia@example.com')
        r_no = self.richiedi('nessuno@example.com')
        self.assertEqual(r_no.status_code, 200)
        self.assertEqual(r_ok.json(), r_no.json())
        self.assertEqual(len(mail.outbox), 1)

    def test_reset_completo_e_link_monouso(self):
        self.richiedi('giulia@example.com')
        uid, token = self.link_dalla_mail()
        r = self.conferma(uid, token)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(self.login_ok(NUOVA))
        self.assertFalse(self.login_ok(PASSWORD))
        # Il link non si può riusare.
        r = self.conferma(uid, token, password='AltraPassword!99')
        self.assertEqual(r.status_code, 400)
        self.assertIn('scaduto', r.json()['detail'])

    def test_token_falso(self):
        self.richiedi('giulia@example.com')
        uid, _ = self.link_dalla_mail()
        r = self.conferma(uid, 'abc-123')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(self.login_ok(PASSWORD))

    def test_uid_falso(self):
        r = self.conferma('xxxx', 'abc-123')
        self.assertEqual(r.status_code, 400)

    def test_password_debole_non_brucia_il_link(self):
        self.richiedi('giulia@example.com')
        uid, token = self.link_dalla_mail()
        self.assertEqual(self.conferma(uid, token, password='123').status_code, 400)
        self.assertEqual(self.conferma(uid, token).status_code, 200)

    def test_limite_richieste(self):
        for _ in range(5):
            self.assertEqual(self.richiedi('giulia@example.com').status_code, 200)
        self.assertEqual(self.richiedi('giulia@example.com').status_code, 429)
