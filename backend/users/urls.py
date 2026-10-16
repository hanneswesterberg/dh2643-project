from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.CSRFTokenView.as_view(), name='csrf-token'),
    path('csrf', views.CSRFTokenView.as_view(), name='csrf-token-noslash'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('register', views.RegisterView.as_view(), name='register-noslash'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('me', views.CurrentUserView.as_view(), name='current-user-noslash'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('login', views.LoginView.as_view(), name='login-noslash'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('logout', views.LogoutView.as_view(), name='logout-noslash'),
    path('saved-events/', views.SavedEventsView.as_view(), name='list-saved-events'),
    path('saved-events', views.SavedEventsView.as_view(), name='list-saved-events-noslash'),
    path('saved-events/<int:event_id>/', views.ManageSavedEventView.as_view(), name='manage-saved-event'),
    path('saved-events/<int:event_id>', views.ManageSavedEventView.as_view(), name='manage-saved-event-noslash')
]
