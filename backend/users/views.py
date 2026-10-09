from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from events.models import Event

class CurrentUserView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                "username": request.user.username,
                "email": request.user.email
            }, status=status.HTTP_200_OK)
        return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)  # Sets the secure session cookie
            return Response({"message": "Logged in successfully"}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class SavedEventsView(APIView):
    def get(self, request):
        """Returns a list of all events the user has saved"""
        if not request.user.is_authenticated:
            return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Returns the IDs (or full serialized data) of saved events
        saved_events = request.user.profile.saved_events.values('id', 'name', 'start')
        return Response(list(saved_events), status=status.HTTP_200_OK)

class ManageSavedEventView(APIView):
    def post(self, request, event_id):
        """Saves a specific event"""
        if not request.user.is_authenticated:
            return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            event = Event.objects.get(id=event_id)
            request.user.profile.saved_events.add(event)
            return Response({"message": "Event saved"}, status=status.HTTP_201_CREATED)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, event_id):
        """Removes a specific event"""
        if not request.user.is_authenticated:
            return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            event = Event.objects.get(id=event_id)
            request.user.profile.saved_events.remove(event)
            return Response({"message": "Event removed"}, status=status.HTTP_200_OK)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)


