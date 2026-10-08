from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.contrib.auth import authenticate, login, logout
from events.models import Event


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    def list(self, request):
        if request.user.is_authenticated:
            user_data = {
                "username": request.user.username,
                "email": request.user.email,
                # Add other fields as necessary
            }
            return Response(user_data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

class LoginView(viewsets.ViewSet):
    def create(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # This automatically creates the session and sets the cookie
            login(request, user)
            return Response({"message": "Logged in successfully"}, status=status.HTTP_200_OK)
        
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class SavedEventsView(viewsets.ViewSet):
    def create(self, request, event_id):
        # Ensure the user is logged in
        if not request.user.is_authenticated:
            return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            event = Event.objects.get(id=event_id)
            # Add to the many-to-many relationship
            request.user.profile.saved_events.add(event)
            return Response({"message": "Event saved"}, status=status.HTTP_201_CREATED)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)
