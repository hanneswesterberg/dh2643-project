from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.EventViewSet, basename='event')

urlpatterns = [
    path('search', views.GlobalSearchView.as_view(), name='global-search-noslash'),
    path('search/', views.GlobalSearchView.as_view(), name='global-search'),
    path('', include(router.urls)),
]
