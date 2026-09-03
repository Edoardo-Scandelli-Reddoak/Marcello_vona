"""Nessuna view esposta.

Lo sblocco social a pagamento non esiste piu': da settembre 2026 i link social
sono visibili a tutti gratuitamente sulla scheda pubblica. Sono stati rimossi
il checkout, il webhook e il filtro nel serializer.

L'app resta registrata solo per conservare la tabella `SbloccoSocial`, che
contiene i pagamenti storici da 1,90 € conteggiati nel fatturato della pagina
"Analisi dati".
"""
