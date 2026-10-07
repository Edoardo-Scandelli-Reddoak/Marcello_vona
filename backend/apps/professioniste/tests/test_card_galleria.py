"""La card delle escort deve portarsi dietro la galleria.

Nelle liste (home, /escort, pagine città) la foto della card si scorre col
dito: dopo la foto profilo vengono le foto della galleria, nell'ordine scelto
dall'escort.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase

from apps.professioniste.models import Categoria, FotoProfessionista, Professionista
from apps.professioniste.serializers import ProfessionistaCardSerializer


class CardGalleriaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        categoria = Categoria.objects.create(nome='donna', label='Donna')
        cls.prof = Professionista.objects.create(
            user=get_user_model().objects.create_user(username='a', email='a@example.com', password='x'),
            nome='Aurora', categoria=categoria, telefono='3330000000',
            via='Via Roma 1', citta='Roma', provincia='RM',
            foto_profilo='escort/profilo/aurora.jpg',
            documento_fronte='escort/documenti/f.jpg', documento_retro='escort/documenti/r.jpg',
        )
        FotoProfessionista.objects.create(professionista=cls.prof, immagine='escort/galleria/b.jpg', ordine=1)
        FotoProfessionista.objects.create(professionista=cls.prof, immagine='escort/galleria/a.jpg', ordine=0)

    def _card(self, prof):
        request = RequestFactory().get('/api/escort/')
        request.user = AnonymousUser()
        return ProfessionistaCardSerializer(prof, context={'request': request}).data

    def test_card_include_la_galleria_in_ordine(self):
        galleria = self._card(self.prof)['galleria']
        self.assertEqual(len(galleria), 2)
        self.assertTrue(galleria[0]['immagine'].endswith('escort/galleria/a.jpg'))
        self.assertTrue(galleria[1]['immagine'].endswith('escort/galleria/b.jpg'))

    def test_con_prefetch_la_galleria_non_fa_query_per_card(self):
        prof = Professionista.objects.prefetch_related('galleria').get(pk=self.prof.pk)
        with self.assertNumQueries(0):
            prof.galleria.all()[0].immagine.url

    def test_card_senza_galleria(self):
        self.prof.galleria.all().delete()
        self.assertEqual(self._card(self.prof)['galleria'], [])
