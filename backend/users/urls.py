from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.LoginView.as_view({'post': 'create'}), name='login'),
    path('saved-events/<int:event_id>/', views.SavedEventsView.as_view({'post': 'create'}), name='saved-events'),
]



#router.register(r'login', views.LoginView, basename='login')
#router.register(r'saved-events', views.SavedEventsView, basename='saved-events')
