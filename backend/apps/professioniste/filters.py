import django_filters
from .models import Professionista
from .serializers import LEGACY_CATEGORIA_SLUG


def _expand_categoria_nomi(value: str) -> list[str]:
    """Accetta slug nuovo o legacy così i filtri funzionano prima/dopo la migrazione DB."""
    if not value:
        return []
    v = value.strip().lower()
    names = {v}
    if v in LEGACY_CATEGORIA_SLUG:
        names.add(LEGACY_CATEGORIA_SLUG[v])
    for old, new in LEGACY_CATEGORIA_SLUG.items():
        if new == v:
            names.add(old)
    return list(names)


class ProfessionistaFilter(django_filters.FilterSet):
    categoria = django_filters.CharFilter(method='filter_categoria')
    provincia = django_filters.CharFilter(field_name='provincia', lookup_expr='iexact')
    rating_min = django_filters.NumberFilter(method='filter_rating_min')

    class Meta:
        model = Professionista
        fields = ['categoria', 'provincia']

    def filter_categoria(self, queryset, name, value):
        nomi = _expand_categoria_nomi(value)
        if not nomi:
            return queryset
        return queryset.filter(categoria__nome__in=nomi)

    def filter_rating_min(self, queryset, name, value):
        ids = [p.id for p in queryset if p.rating_medio >= value]
        return queryset.filter(id__in=ids)
