import django_filters
from .models import Professionista


class ProfessionistaFilter(django_filters.FilterSet):
    categoria = django_filters.CharFilter(field_name='categoria__nome')
    provincia = django_filters.CharFilter(field_name='provincia', lookup_expr='iexact')
    rating_min = django_filters.NumberFilter(method='filter_rating_min')

    class Meta:
        model = Professionista
        fields = ['categoria', 'provincia']

    def filter_rating_min(self, queryset, name, value):
        ids = [p.id for p in queryset if p.rating_medio >= value]
        return queryset.filter(id__in=ids)
