from django.urls import include, path
from . import views
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
#router.register(r'login', views.LoginView, basename='login')
#router.register(r'saved-events', views.SavedEventsView, basename='saved-events')
router.register(r'user', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.LoginView.as_view({'post': 'create'}), name='login'),
    path('saved-events/<int:event_id>/', views.SavedEventsView.as_view({'post': 'create'}), name='saved-events'),
]
