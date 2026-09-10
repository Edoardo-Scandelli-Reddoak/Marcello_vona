"""Le categorie devono essere aggiungibili dall'admin senza toccare il codice.

Regressione coperta: `Categoria.nome` era un CharField con `choices` fissi
(donna/trans/coppia) e `unique=True`. Nell'admin diventava una tendina chiusa
sulle 3 voci gia' presenti a DB, quindi il form "Aggiungi categoria" non
poteva mai validare.
"""

from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.professioniste.admin import CategoriaAdmin
from apps.professioniste.models import Categoria


class CategoriaAdminTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username='admin', email='admin@example.com', password='x'
        )
        # Stato di partenza reale in produzione: le 3 categorie base esistono.
        Categoria.objects.create(nome='donna', label='Donna', ordine=0)
        Categoria.objects.create(nome='trans', label='Trans', ordine=1)
        Categoria.objects.create(nome='coppia', label='Coppia', ordine=2)

    def _form(self, data):
        request = RequestFactory().post('/admin/professioniste/categoria/add/')
        request.user = self.user
        model_admin = CategoriaAdmin(Categoria, django_admin.site)
        form_class = model_admin.get_form(request, obj=None, change=False)
        return form_class(data=data)

    def test_aggiunge_una_categoria_nuova_dall_admin(self):
        form = self._form({'label': 'Massaggi', 'nome': 'massaggi', 'ordine': 3})
        self.assertTrue(form.is_valid(), form.errors.as_json())
        categoria = form.save()
        self.assertEqual(categoria.nome, 'massaggi')
        self.assertEqual(categoria.label, 'Massaggi')
        self.assertEqual(Categoria.objects.count(), 4)

    def test_slug_generato_dall_etichetta_se_lasciato_vuoto(self):
        form = self._form({'label': 'Uomo Gay', 'nome': '', 'ordine': 4})
        self.assertTrue(form.is_valid(), form.errors.as_json())
        categoria = form.save()
        self.assertEqual(categoria.nome, 'uomo-gay')

    def test_slug_duplicato_da_errore_di_validazione_non_500(self):
        form = self._form({'label': 'Donna', 'nome': '', 'ordine': 9})
        self.assertFalse(form.is_valid())
        self.assertIn('nome', form.errors)
        self.assertEqual(Categoria.objects.count(), 3)

    def test_senza_etichetta_ne_slug_errore_leggibile(self):
        form = self._form({'label': '', 'nome': '', 'ordine': 9})
        self.assertFalse(form.is_valid())
        self.assertEqual(Categoria.objects.count(), 3)


class CategoriaApiTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Categoria.objects.create(nome='donna', label='Donna', ordine=0)
        Categoria.objects.create(nome='trans', label='Trans', ordine=1)
        Categoria.objects.create(nome='coppia', label='Coppia', ordine=2)
        Categoria.objects.create(nome='massaggi', label='Massaggi', ordine=3)

    def test_endpoint_espone_le_categorie_nuove_in_ordine(self):
        resp = self.client.get('/api/categorie/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(
            [c['nome'] for c in data],
            ['donna', 'trans', 'coppia', 'massaggi'],
        )
        self.assertEqual(data[-1]['label'], 'Massaggi')

    def test_ordine_dall_admin_riordina_la_lista(self):
        Categoria.objects.filter(nome='massaggi').update(ordine=0)
        Categoria.objects.filter(nome='donna').update(ordine=3)
        nomi = [c['nome'] for c in self.client.get('/api/categorie/').json()]
        self.assertEqual(nomi, ['massaggi', 'trans', 'coppia', 'donna'])

    def test_a_parita_di_ordine_vince_l_alfabetico(self):
        Categoria.objects.all().update(ordine=0)
        nomi = [c['nome'] for c in self.client.get('/api/categorie/').json()]
        self.assertEqual(nomi, ['coppia', 'donna', 'massaggi', 'trans'])


class CategoriaModelTest(TestCase):
    def test_label_derivata_dallo_slug_se_manca(self):
        categoria = Categoria.objects.create(nome='uomo-gay')
        self.assertEqual(categoria.label, 'Uomo Gay')

    def test_str_usa_l_etichetta(self):
        self.assertEqual(str(Categoria(nome='donna', label='Donna')), 'Donna')

    def test_seed_categories_non_cancella_le_categorie_custom(self):
        from django.core.management import call_command

        Categoria.objects.create(nome='massaggi', label='Massaggi', ordine=3)
        call_command('seed_categories', verbosity=0)
        self.assertTrue(Categoria.objects.filter(nome='massaggi').exists())
        self.assertEqual(Categoria.objects.count(), 4)
