from django import template

register = template.Library()


def _it(n: float, decimali: int) -> str:
    s = f'{n:,.{decimali}f}'
    return s.replace(',', '§').replace('.', ',').replace('§', '.')


@register.filter
def num(valore, decimali=0):
    """1234.5 -> '1.235' (o '1.234,5' con decimali=1). None -> '—'."""
    if valore is None or valore == '':
        return '—'
    try:
        return _it(float(valore), int(decimali))
    except (TypeError, ValueError):
        return valore


@register.filter
def euro(valore):
    if valore is None:
        return '—'
    v = float(valore)
    return '€ ' + _it(v, 0 if v == int(v) else 2)


@register.filter
def pct(valore):
    return '—' if valore is None else _it(float(valore), 1).rstrip('0').rstrip(',') + '%'


@register.filter
def kpi_valore(kpi):
    return euro(kpi['valore']) if kpi['formato'] == 'euro' else num(kpi['valore'])


@register.filter
def kpi_precedente(kpi):
    return euro(kpi['precedente']) if kpi['formato'] == 'euro' else num(kpi['precedente'])


@register.filter
def barra(valore, massimo):
    """Larghezza % di una barra orizzontale rispetto al massimo della lista."""
    # Restituisco una stringa col punto: un float verrebbe localizzato in
    # "33,3" dal template e il CSS non lo capirebbe.
    try:
        v = float(valore) / float(massimo) * 100 if massimo else 0
    except (TypeError, ValueError, ZeroDivisionError):
        v = 0
    return f'{max(0.0, min(v, 100.0)):.1f}'


@register.simple_tag
def massimo(righe, chiave='count'):
    return max((r.get(chiave) or 0 for r in righe), default=0)
