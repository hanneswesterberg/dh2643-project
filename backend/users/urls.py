from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('saved-events/', views.SavedEventsView.as_view(), name='list-saved-events'),
    path('saved-events/<int:event_id>/', views.ManageSavedEventView.as_view(), name='manage-saved-event'),
]
