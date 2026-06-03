import os
import shutil
from datetime import date
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from apps.accounts.models import User
from apps.professioniste.models import Professionista, Categoria, Tag
from apps.reviews.models import Recensione, RecensioneSito
from apps.abbonamenti.models import PianoAbbonamento, Abbonamento


# 10 tag standard, definiti centralmente. L'escort in fase di registrazione
# sceglie da questa lista (vedi GET /api/tags/).
TAG_STANDARD = [
    'Italiana',
    'Straniera',
    'Mature',
    'Giovane',
    'Disponibile 24/7',
    'Domicilio',
    'Hotel',
    'Compagnia / Cena',
    'Viaggi',
    'Massaggi',
]


ESCORT = [
    {
        'email': 'chiara@demo.com',
        'nome': 'Chiara Bianchi',
        'categoria': 'donna',
        'bio': 'Massaggiatrice con oltre 8 anni di esperienza. Specializzata in massaggi decontratturanti, rilassanti e sportivi. Lavoro sia in studio che a domicilio, con un approccio olistico al benessere della persona. Ogni sessione è personalizzata sulle esigenze specifiche del cliente.',
        'telefono': '+39 333 1234567',
        'via': 'Via Torino 42',
        'cap': '20123',
        'citta': 'Milano',
        'zona': 'Navigli',
        'provincia': 'MI',
        'nazione': 'Italia',
        'lat': 45.4642,
        'lng': 9.1900,
        'tags': ['Italiana', 'Giovane', 'Domicilio', 'Hotel', 'Disponibile 24/7'],
        'foto': 'chiara.jpg',
        'stato': 'Sempre disponibile',
        'disponibilita': 'entrambe',
        'orari_tipo': '24_7',
        'orari_altro': '',
        'tariffa_30min': 80,
        'tariffa_1ora': 150,
        'onlyfans': 'https://onlyfans.com/chiarabianchi',
        'instagram': 'https://instagram.com/chiara.bianchi.massaggi',
        'facebook': 'https://facebook.com/chiara.bianchi.massaggi',
        'tiktok': 'https://tiktok.com/@chiara.bianchi.massaggi',
        'telegram': 'https://t.me/chiara_bianchi_massaggi',
    },
    {
        'email': 'giulia@demo.com',
        'nome': 'Giulia Rossi',
        'categoria': 'trans',
        'bio': 'Insegnante di Hatha Yoga e Vinyasa certificata RYT-500. Credo che lo yoga sia per tutti, indipendentemente da età o livello di flessibilità. Le mie lezioni combinano pratica fisica, respirazione consapevole e meditazione guidata. Disponibile per lezioni individuali e di gruppo.',
        'telefono': '+39 347 9876543',
        'via': 'Via del Corso 120',
        'cap': '00186',
        'citta': 'Roma',
        'zona': 'Centro Storico',
        'provincia': 'RM',
        'nazione': 'Italia',
        'lat': 41.9028,
        'lng': 12.4964,
        'tags': ['Straniera', 'Giovane', 'Hotel', 'Compagnia / Cena', 'Viaggi'],
        'foto': 'giulia.jpg',
        'stato': 'Contattami subito',
        'disponibilita': 'ricevo',
        'orari_tipo': 'altro',
        'orari_altro': 'Lun-Ven 9-21, Sab su appuntamento',
        'tariffa_30min': 60,
        'tariffa_1ora': 100,
        'instagram': 'https://instagram.com/giulia.yoga.roma',
    },
    {
        'email': 'sofia@demo.com',
        'nome': 'Sofia Marino',
        'categoria': 'coppia',
        'bio': 'Operatrice del benessere specializzata in trattamenti rilassanti e aromaterapia. Offro percorsi personalizzati di rilassamento profondo, combinando tecniche di respirazione, oli essenziali e musica ambientale. Il mio studio è un\'oasi di pace nel centro di Firenze.',
        'telefono': '+39 320 5551234',
        'via': 'Via dei Calzaiuoli 15',
        'cap': '50122',
        'citta': 'Firenze',
        'zona': 'Duomo',
        'provincia': 'FI',
        'nazione': 'Italia',
        'lat': 43.7696,
        'lng': 11.2558,
        'tags': ['Italiana', 'Mature', 'Domicilio', 'Massaggi', 'Disponibile 24/7'],
        'foto': 'sofia.jpg',
        'stato': 'Online ora',
        'disponibilita': 'ricevo',
        'orari_tipo': 'h24',
        'orari_altro': '',
        'tariffa_30min': 70,
        'tariffa_1ora': 120,
    },
    {
        'email': 'elena@demo.com',
        'nome': 'Elena Colombo',
        'categoria': 'donna',
        'bio': 'Fisioterapista e massaggiatrice olistica. Mi sono formata tra Italia e Thailandia, dove ho appreso le tecniche del massaggio tradizionale thai. Offro trattamenti che spaziano dal massaggio thai classico alla riflessologia plantare. Ricevo su appuntamento nel mio studio privato.',
        'telefono': '+39 339 8887766',
        'via': 'Corso Vittorio Emanuele II 80',
        'cap': '10121',
        'citta': 'Torino',
        'zona': 'Centro',
        'provincia': 'TO',
        'nazione': 'Italia',
        'lat': 45.0703,
        'lng': 7.6869,
        'tags': ['Italiana', 'Mature', 'Domicilio', 'Massaggi', 'Compagnia / Cena'],
        'foto': 'elena.jpg',
        'stato': 'Disponibile oggi',
        'disponibilita': 'entrambe',
        'orari_tipo': 'altro',
        'orari_altro': 'Tutti i giorni 10-22',
        'tariffa_30min': 90,
        'tariffa_1ora': 160,
    },
    {
        'email': 'martina@demo.com',
        'nome': 'Martina Ferri',
        'categoria': 'trans',
        'bio': 'Insegnante di Yoga Kundalini e meditazione. Dopo un percorso formativo in India, ho dedicato la mia vita a condividere i benefici dello yoga. Le mie lezioni sono un viaggio interiore alla scoperta di sé. Organizzo anche ritiri e workshop tematici durante tutto l\'anno.',
        'telefono': '+39 348 2223344',
        'via': 'Via Indipendenza 33',
        'cap': '40121',
        'citta': 'Bologna',
        'zona': 'Centro Storico',
        'provincia': 'BO',
        'nazione': 'Italia',
        'lat': 44.4949,
        'lng': 11.3426,
        'tags': ['Straniera', 'Mature', 'Hotel', 'Viaggi', 'Disponibile 24/7'],
        'foto': 'martina.jpg',
        'stato': 'Prenotazioni aperte',
        'disponibilita': 'altrui',
        'orari_tipo': 'altro',
        'orari_altro': 'Su prenotazione, anche serale',
        'tariffa_30min': 50,
        'tariffa_1ora': 90,
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
    ('elena@demo.com', 'user4@demo.com', 'Sara', 5, 'Elena è seria e preparata. Il suo studio è un piccolo gioiello. Consigliatissima!'),
    # Martina
    ('martina@demo.com', 'user5@demo.com', 'Paolo', 4, 'La lezione di Kundalini con Martina è stata intensa e trasformativa. Non è yoga classico, è qualcosa di più profondo.'),
    ('martina@demo.com', 'user6@demo.com', 'Francesca', 5, 'Ho partecipato a un ritiro organizzato da Martina e mi ha cambiato la vita. Una persona illuminata e generosa.'),
]

RECENSIONI_SITO = [
    ('Laura M.', 5, 'Grazie a questo sito ho trovato la mia insegnante di yoga ideale in meno di 5 minuti. Filtri semplici e profili completi!'),
    ('Roberto S.', 4, 'Finalmente una piattaforma dedicata al benessere. Ho scoperto escort vicino a casa che non conoscevo.'),
    ('Valentina C.', 5, 'Uso il sito da mesi ormai. Ogni volta che ho bisogno di un massaggio o di rilassarmi, so dove cercare. Consigliatissimo!'),
]


class Command(BaseCommand):
    help = 'Popola il database con 5 escort demo, recensioni e recensioni sito'

    def _ensure_in_storage(self, source_dir, filename):
        """Carica `filename` nel backend di storage configurato (R2 o filesystem)
        se non è già presente. Il file sorgente è bundlato nell'image Docker a
        BASE_DIR/media/escort/profilo/. Idempotente: in filesystem mode è no-op
        perché il file è già lì; in R2 mode uploada solo al primo run dopo
        l'attivazione del bucket.
        """
        target_path = f"escort/profilo/{filename}"
        if default_storage.exists(target_path):
            return
        source_file = source_dir / filename
        if not source_file.exists():
            self.stdout.write(self.style.WARNING(
                f'Foto sorgente mancante (skip upload storage): {source_file}'
            ))
            return
        with open(source_file, 'rb') as f:
            saved_path = default_storage.save(target_path, File(f))
        self.stdout.write(self.style.SUCCESS(
            f'Foto caricata nello storage: {saved_path}'
        ))

    def handle(self, *args, **options):
        source_dir = settings.MEDIA_ROOT / 'escort' / 'profilo'

        # Bootstrap del catalogo tag SOLO al primissimo deploy (Tag table
        # vuota): crea i 10 default così le escort demo hanno qualcosa da
        # referenziare. Dopo, l'admin è la source of truth: niente più
        # creazioni o cancellazioni automatiche, altrimenti le modifiche
        # fatte dal pannello vengono sovrascritte ad ogni deploy.
        if not Tag.objects.exists():
            for nome in TAG_STANDARD:
                Tag.objects.create(nome=nome)
            self.stdout.write(self.style.SUCCESS(
                f'Bootstrap catalogo tag: creati {len(TAG_STANDARD)} tag default.'
            ))
        # Map per riferirsi ai tag esistenti per nome (solo quelli presenti):
        # le escort demo proveranno ad assegnare i propri tag e salteranno
        # eventuali nomi non più nel catalogo.
        existing_tags = {t.nome: t for t in Tag.objects.all()}

        # Create escort
        for p_data in ESCORT:
            cat = Categoria.objects.get(nome=p_data['categoria'])

            user, created = User.objects.get_or_create(
                email=p_data['email'],
                defaults={
                    'username': p_data['email'],
                    'user_type': 'escort',
                    'first_name': p_data['nome'].split()[0],
                    'last_name': p_data['nome'].split()[-1],
                }
            )
            if created:
                user.set_password('demo1234')
                user.save()

            # Assicura che la foto sia presente nello storage backend (R2 o
            # filesystem). Senza questa chiamata, dopo l'attivazione di R2 i
            # path foto_profilo/documento_* esistono nel DB ma puntano a un
            # bucket vuoto → immagini broken.
            self._ensure_in_storage(source_dir, p_data['foto'])
            foto_path = f"escort/profilo/{p_data['foto']}"

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
                    'zona': p_data.get('zona', ''),
                    'provincia': p_data['provincia'],
                    'nazione': p_data['nazione'],
                    'latitudine': p_data['lat'],
                    'longitudine': p_data['lng'],
                    'disponibilita': p_data.get('disponibilita', ''),
                    'orari_tipo': p_data.get('orari_tipo', ''),
                    'orari_altro': p_data.get('orari_altro', ''),
                    'tariffa_30min': p_data.get('tariffa_30min'),
                    'tariffa_1ora': p_data.get('tariffa_1ora'),
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
            # Sync social fields, address and i nuovi campi (zona, disponibilità, orari, tariffe)
            # anche sui profili demo già esistenti, così riesce a ri-popolare i dati
            # quando il seed viene rieseguito dopo una modifica al modello.
            of = p_data.get('onlyfans', '')
            ig = p_data.get('instagram', '')
            fb = p_data.get('facebook', '')
            tk = p_data.get('tiktok', '')
            tg = p_data.get('telegram', '')
            stato = p_data.get('stato', '')
            zona = p_data.get('zona', '')
            disponibilita = p_data.get('disponibilita', '')
            orari_tipo = p_data.get('orari_tipo', '')
            orari_altro = p_data.get('orari_altro', '')
            tariffa_30min = p_data.get('tariffa_30min')
            tariffa_1ora = p_data.get('tariffa_1ora')
            changed = False
            if (prof.onlyfans_url != of or prof.instagram_url != ig or prof.facebook_url != fb
                    or prof.tiktok_url != tk or prof.telegram_url != tg
                    or prof.stato != stato
                    or prof.zona != zona
                    or prof.disponibilita != disponibilita
                    or prof.orari_tipo != orari_tipo
                    or prof.orari_altro != orari_altro
                    or prof.tariffa_30min != tariffa_30min
                    or prof.tariffa_1ora != tariffa_1ora):
                prof.onlyfans_url = of
                prof.instagram_url = ig
                prof.facebook_url = fb
                prof.tiktok_url = tk
                prof.telegram_url = tg
                prof.stato = stato
                prof.zona = zona
                prof.disponibilita = disponibilita
                prof.orari_tipo = orari_tipo
                prof.orari_altro = orari_altro
                prof.tariffa_30min = tariffa_30min
                prof.tariffa_1ora = tariffa_1ora
                changed = True
            if not prof.indirizzo_pubblico_aggiornato_at:
                prof.indirizzo_pubblico_aggiornato_at = timezone.now()
                changed = True
            if changed:
                prof.save()
            # Always re-sync tags so the demo profiles stay aligned with TAG_STANDARD
            # even when re-running the seed.
            # Assegna solo i tag che esistono ancora nel catalogo (l'admin
            # potrebbe averne rinominati o cancellati dei default).
            prof.tags.set([existing_tags[t] for t in p_data['tags'] if t in existing_tags])
            if created:
                self.stdout.write(self.style.SUCCESS(f'Creata: {prof.nome}'))
            else:
                self.stdout.write(f'Già esistente (tag sincronizzati): {prof.nome}')

        # Active subscriptions for demo profiles: all five get an "evidenza" plan
        # so they all appear in "Le più apprezzate".
        piano_evidenza = PianoAbbonamento.objects.filter(tipo='evidenza', durata_giorni=30).first()
        for p_data in ESCORT:
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
