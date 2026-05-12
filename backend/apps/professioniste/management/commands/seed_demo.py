import os
import shutil
from datetime import date
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from apps.accounts.models import User
from apps.professioniste.models import Professionista, Categoria, Tag
from apps.reviews.models import Recensione, RecensioneSito
from apps.abbonamenti.models import PianoAbbonamento, Abbonamento


# 10 tag standard, definiti centralmente. La professionista in fase di registrazione
# sceglie da questa lista (vedi GET /api/tags/).
TAG_STANDARD = [
    'Aromaterapia',
    'Disponibile weekend',
    'Domicilio',
    'Lezioni di gruppo',
    'Lezioni online',
    'Massaggio decontratturante',
    'Massaggio sportivo',
    'Meditazione guidata',
    'Studio privato',
    'Yoga principianti',
]


PROFESSIONISTE = [
    {
        'email': 'chiara@demo.com',
        'nome': 'Chiara Bianchi',
        'categoria': 'massaggi',
        'bio': 'Massaggiatrice professionista con oltre 8 anni di esperienza. Specializzata in massaggi decontratturanti, rilassanti e sportivi. Lavoro sia in studio che a domicilio, con un approccio olistico al benessere della persona. Ogni sessione è personalizzata sulle esigenze specifiche del cliente.',
        'telefono': '+39 333 1234567',
        'via': 'Via Torino 42',
        'cap': '20123',
        'citta': 'Milano',
        'provincia': 'MI',
        'nazione': 'Italia',
        'lat': 45.4642,
        'lng': 9.1900,
        'tags': ['Domicilio', 'Studio privato', 'Massaggio decontratturante', 'Massaggio sportivo', 'Disponibile weekend'],
        'foto': 'chiara.jpg',
        'stato': 'Sempre disponibile',
        'onlyfans': 'https://onlyfans.com/chiarabianchi',
        'instagram': 'https://instagram.com/chiara.bianchi.massaggi',
        'facebook': 'https://facebook.com/chiara.bianchi.massaggi',
        'tiktok': 'https://tiktok.com/@chiara.bianchi.massaggi',
        'telegram': 'https://t.me/chiara_bianchi_massaggi',
    },
    {
        'email': 'giulia@demo.com',
        'nome': 'Giulia Rossi',
        'categoria': 'yoga',
        'bio': 'Insegnante di Hatha Yoga e Vinyasa certificata RYT-500. Credo che lo yoga sia per tutti, indipendentemente da età o livello di flessibilità. Le mie lezioni combinano pratica fisica, respirazione consapevole e meditazione guidata. Disponibile per lezioni individuali e di gruppo.',
        'telefono': '+39 347 9876543',
        'via': 'Via del Corso 120',
        'cap': '00186',
        'citta': 'Roma',
        'provincia': 'RM',
        'nazione': 'Italia',
        'lat': 41.9028,
        'lng': 12.4964,
        'tags': ['Studio privato', 'Lezioni di gruppo', 'Lezioni online', 'Yoga principianti', 'Disponibile weekend'],
        'foto': 'giulia.jpg',
        'stato': 'Contattami subito',
        'instagram': 'https://instagram.com/giulia.yoga.roma',
    },
    {
        'email': 'sofia@demo.com',
        'nome': 'Sofia Marino',
        'categoria': 'relax',
        'bio': 'Operatrice del benessere specializzata in trattamenti rilassanti e aromaterapia. Offro percorsi personalizzati di rilassamento profondo, combinando tecniche di respirazione, oli essenziali e musica ambientale. Il mio studio è un\'oasi di pace nel centro di Firenze.',
        'telefono': '+39 320 5551234',
        'via': 'Via dei Calzaiuoli 15',
        'cap': '50122',
        'citta': 'Firenze',
        'provincia': 'FI',
        'nazione': 'Italia',
        'lat': 43.7696,
        'lng': 11.2558,
        'tags': ['Studio privato', 'Aromaterapia', 'Meditazione guidata', 'Disponibile weekend'],
        'foto': 'sofia.jpg',
        'stato': 'Online ora',
    },
    {
        'email': 'elena@demo.com',
        'nome': 'Elena Colombo',
        'categoria': 'massaggi',
        'bio': 'Fisioterapista e massaggiatrice olistica. Mi sono formata tra Italia e Thailandia, dove ho appreso le tecniche del massaggio tradizionale thai. Offro trattamenti che spaziano dal massaggio thai classico alla riflessologia plantare. Ricevo su appuntamento nel mio studio privato.',
        'telefono': '+39 339 8887766',
        'via': 'Corso Vittorio Emanuele II 80',
        'cap': '10121',
        'citta': 'Torino',
        'provincia': 'TO',
        'nazione': 'Italia',
        'lat': 45.0703,
        'lng': 7.6869,
        'tags': ['Studio privato', 'Massaggio decontratturante', 'Domicilio', 'Disponibile weekend'],
        'foto': 'elena.jpg',
        'stato': 'Disponibile oggi',
    },
    {
        'email': 'martina@demo.com',
        'nome': 'Martina Ferri',
        'categoria': 'yoga',
        'bio': 'Insegnante di Yoga Kundalini e meditazione. Dopo un percorso formativo in India, ho dedicato la mia vita a condividere i benefici dello yoga. Le mie lezioni sono un viaggio interiore alla scoperta di sé. Organizzo anche ritiri e workshop tematici durante tutto l\'anno.',
        'telefono': '+39 348 2223344',
        'via': 'Via Indipendenza 33',
        'cap': '40121',
        'citta': 'Bologna',
        'provincia': 'BO',
        'nazione': 'Italia',
        'lat': 44.4949,
        'lng': 11.3426,
        'tags': ['Lezioni di gruppo', 'Yoga principianti', 'Meditazione guidata', 'Lezioni online', 'Studio privato'],
        'foto': 'martina.jpg',
        'stato': 'Prenotazioni aperte',
    },
]

RECENSIONI = [
    # Chiara
    ('chiara@demo.com', 'user1@demo.com', 'Marco', 5, 'Chiara è fantastica! Avevo un dolore alla schiena da settimane e dopo una sola seduta mi sentivo già molto meglio. Super consigliata.'),
    ('chiara@demo.com', 'user2@demo.com', 'Anna', 4, 'Professionale e competente. Lo studio è pulito e accogliente. Unica nota: i tempi di attesa per un appuntamento sono un po\' lunghi.'),
    ('chiara@demo.com', 'user3@demo.com', 'Luca', 5, 'Il miglior massaggio che abbia mai fatto. Chiara ha mani d\'oro e sa esattamente dove intervenire.'),
    # Giulia
    ('giulia@demo.com', 'user4@demo.com', 'Sara', 5, 'Giulia è un\'insegnante incredibile. Riesce a rendere lo yoga accessibile anche a chi parte da zero. Le sue lezioni sono un momento di pura pace.'),
    ('giulia@demo.com', 'user5@demo.com', 'Paolo', 5, 'Frequento le lezioni di Giulia da 6 mesi e la mia flessibilità è migliorata enormemente. Ambiente sereno e professionale.'),
    # Sofia
    ('sofia@demo.com', 'user6@demo.com', 'Francesca', 4, 'L\'aromaterapia con Sofia è un\'esperienza unica. Ti senti trasportata in un\'altra dimensione. Lo studio è bellissimo.'),
    ('sofia@demo.com', 'user1@demo.com', 'Marco', 5, 'Sono uscito dal trattamento completamente rilassato. Sofia ha una sensibilità unica nel capire di cosa hai bisogno.'),
    # Elena
    ('elena@demo.com', 'user2@demo.com', 'Anna', 5, 'Il massaggio thai di Elena è spettacolare. Si vede che ha studiato in Thailandia, la tecnica è impeccabile.'),
    ('elena@demo.com', 'user3@demo.com', 'Luca', 4, 'Molto brava nella riflessologia. Dopo il trattamento mi sentivo leggerissimo. Tornerò sicuramente.'),
    ('elena@demo.com', 'user4@demo.com', 'Sara', 5, 'Elena è una professionista seria e preparata. Il suo studio è un piccolo gioiello. Consigliatissima!'),
    # Martina
    ('martina@demo.com', 'user5@demo.com', 'Paolo', 4, 'La lezione di Kundalini con Martina è stata intensa e trasformativa. Non è yoga classico, è qualcosa di più profondo.'),
    ('martina@demo.com', 'user6@demo.com', 'Francesca', 5, 'Ho partecipato a un ritiro organizzato da Martina e mi ha cambiato la vita. Una persona illuminata e generosa.'),
]

RECENSIONI_SITO = [
    ('Laura M.', 5, 'Grazie a questo sito ho trovato la mia insegnante di yoga ideale in meno di 5 minuti. Filtri semplici e profili completi!'),
    ('Roberto S.', 4, 'Finalmente una piattaforma dedicata al benessere. Ho scoperto professioniste vicino a casa che non conoscevo.'),
    ('Valentina C.', 5, 'Uso il sito da mesi ormai. Ogni volta che ho bisogno di un massaggio o di rilassarmi, so dove cercare. Consigliatissimo!'),
]


class Command(BaseCommand):
    help = 'Popola il database con 5 professioniste demo, recensioni e recensioni sito'

    def handle(self, *args, **options):
        source_dir = settings.MEDIA_ROOT / 'professioniste' / 'profilo'

        # Ensure the 10 standard tags exist (idempotent), and remove any stale tag
        # that isn't in the standard list (so the catalog stays clean).
        tag_objects = {}
        for nome in TAG_STANDARD:
            obj, _ = Tag.objects.get_or_create(nome=nome)
            tag_objects[nome] = obj
        stale = Tag.objects.exclude(nome__in=TAG_STANDARD)
        if stale.exists():
            self.stdout.write(self.style.WARNING(
                f'Rimozione di {stale.count()} tag non più nello standard: {[t.nome for t in stale]}'
            ))
            stale.delete()

        # Create professioniste
        for p_data in PROFESSIONISTE:
            cat = Categoria.objects.get(nome=p_data['categoria'])

            user, created = User.objects.get_or_create(
                email=p_data['email'],
                defaults={
                    'username': p_data['email'],
                    'user_type': 'professionista',
                    'first_name': p_data['nome'].split()[0],
                    'last_name': p_data['nome'].split()[-1],
                }
            )
            if created:
                user.set_password('demo1234')
                user.save()

            foto_path = f"professioniste/profilo/{p_data['foto']}"

            prof, created = Professionista.objects.get_or_create(
                user=user,
                defaults={
                    'nome': p_data['nome'],
                    'categoria': cat,
                    'bio': p_data['bio'],
                    'telefono': p_data['telefono'],
                    'via': p_data['via'],
                    'cap': p_data['cap'],
                    'citta': p_data['citta'],
                    'provincia': p_data['provincia'],
                    'nazione': p_data['nazione'],
                    'latitudine': p_data['lat'],
                    'longitudine': p_data['lng'],
                    'foto_profilo': foto_path,
                    'documento_fronte': foto_path,
                    'documento_retro': foto_path,
                    'data_nascita': date(1990, 1, 1),
                    'stato_approvazione': 'approvata',
                    'data_verifica': timezone.now(),
                    'privacy_accettata': True,
                    'termini_accettati': True,
                    'onlyfans_url': p_data.get('onlyfans', ''),
                    'instagram_url': p_data.get('instagram', ''),
                    'facebook_url': p_data.get('facebook', ''),
                    'tiktok_url': p_data.get('tiktok', ''),
                    'telegram_url': p_data.get('telegram', ''),
                    'stato': p_data.get('stato', ''),
                    'indirizzo_pubblico_aggiornato_at': timezone.now(),
                }
            )
            # Sync social fields and private address on existing demo profiles too
            of = p_data.get('onlyfans', '')
            ig = p_data.get('instagram', '')
            fb = p_data.get('facebook', '')
            tk = p_data.get('tiktok', '')
            tg = p_data.get('telegram', '')
            stato = p_data.get('stato', '')
            changed = False
            if (prof.onlyfans_url != of or prof.instagram_url != ig or prof.facebook_url != fb
                    or prof.tiktok_url != tk or prof.telegram_url != tg
                    or prof.stato != stato):
                prof.onlyfans_url = of
                prof.instagram_url = ig
                prof.facebook_url = fb
                prof.tiktok_url = tk
                prof.telegram_url = tg
                prof.stato = stato
                changed = True
            if not prof.indirizzo_pubblico_aggiornato_at:
                prof.indirizzo_pubblico_aggiornato_at = timezone.now()
                changed = True
            if changed:
                prof.save()
            # Always re-sync tags so the demo profiles stay aligned with TAG_STANDARD
            # even when re-running the seed.
            prof.tags.set([tag_objects[t] for t in p_data['tags']])
            if created:
                self.stdout.write(self.style.SUCCESS(f'Creata: {prof.nome}'))
            else:
                self.stdout.write(f'Già esistente (tag sincronizzati): {prof.nome}')

        # Active subscriptions for demo profiles: all five get an "evidenza" plan
        # so they all appear in "Le più apprezzate".
        piano_evidenza = PianoAbbonamento.objects.filter(tipo='evidenza', durata_giorni=30).first()
        for p_data in PROFESSIONISTE:
            prof = Professionista.objects.get(user__email=p_data['email'])
            if not piano_evidenza:
                continue
            existing = Abbonamento.objects.filter(
                professionista=prof,
                piano__tipo='evidenza',
                stato='attivo',
                scadenza__gt=timezone.now(),
            ).first()
            if existing:
                continue
            abb = Abbonamento(
                professionista=prof,
                piano=piano_evidenza,
                importo_centesimi=piano_evidenza.prezzo_centesimi,
            )
            abb.activate(payment_method='mock')
            self.stdout.write(self.style.SUCCESS(
                f'Abbonamento Evidenza creato per {prof.nome}'
            ))

        # Create reviewer users and reviews
        reviewer_users = {}
        for prof_email, user_email, nome, stelle, testo in RECENSIONI:
            if user_email not in reviewer_users:
                u, _ = User.objects.get_or_create(
                    email=user_email,
                    defaults={
                        'username': user_email,
                        'user_type': 'user',
                        'first_name': nome,
                    }
                )
                if _:
                    u.set_password('demo1234')
                    u.save()
                reviewer_users[user_email] = u

            prof = Professionista.objects.get(user__email=prof_email)
            Recensione.objects.get_or_create(
                professionista=prof,
                autore=reviewer_users[user_email],
                defaults={'stelle': stelle, 'testo': testo}
            )

        self.stdout.write(self.style.SUCCESS(f'{len(RECENSIONI)} recensioni create/verificate'))

        # Site reviews
        for nome, stelle, testo in RECENSIONI_SITO:
            RecensioneSito.objects.get_or_create(
                nome=nome,
                defaults={'stelle': stelle, 'testo': testo, 'attiva': True}
            )

        self.stdout.write(self.style.SUCCESS(f'{len(RECENSIONI_SITO)} recensioni sito create/verificate'))
        self.stdout.write(self.style.SUCCESS('Seed demo completato!'))
