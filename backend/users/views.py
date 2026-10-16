from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from events.models import Event
from .models import UserProfile
from .serializers import UserAccountSerializer


class RegisterView(APIView):
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email', '')
        password = request.data.get('password')

        if not isinstance(username, str) or not username.strip():
            return Response({"error": "A username is required"}, status=status.HTTP_400_BAD_REQUEST)
        if email is not None and not isinstance(email, str):
            return Response({"error": "Email must be a string"}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(password, str) or not password.strip():
            return Response({"error": "A password is required"}, status=status.HTTP_400_BAD_REQUEST)

        username = username.strip()
        email = email.strip() if email else ''
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                )
                UserProfile.objects.create(user=user)
        except IntegrityError:
            if User.objects.filter(username=username).exists():
                return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
            raise

        return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            UserProfile.objects.get_or_create(user=request.user)
            return Response(
                UserAccountSerializer(request.user).data,
                status=status.HTTP_200_OK,
            )
        return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    def put(self, request):
        return self._update_account(request, partial=False)

    def patch(self, request):
        return self._update_account(request, partial=True)

    def delete(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        logout(request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _update_account(self, request, partial):
        if not request.user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        user: User = request.user
        serializer = UserAccountSerializer(
            user,
            data=request.data,
            many=False,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        password_was_changed = request.data.get('password') is not None
        serializer.save()
        if password_was_changed:
            update_session_auth_hash(request, user)
        UserProfile.objects.get_or_create(user=user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        if username is None:
            username = request.data.get('email')
        password = request.data.get('password')

        if not isinstance(username, str) or not username.strip():
            return Response({"error": "Username or email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(password, str) or not password:
            return Response({"error": "Username or email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        identifier = username.strip()
        user = authenticate(request, username=identifier, password=password)
        if user is None:
            matching_email_users = User.objects.filter(email__iexact=identifier)
            if matching_email_users.count() == 1:
                email_user = matching_email_users.first()
                if email_user is not None:
                    user = authenticate(request, username=email_user.username, password=password)
        if user is not None:
            login(request, user)
            return Response({"message": "Logged in successfully"}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


class SavedEventsView(APIView):
    def get(self, request):
        """Returns a list of all events the user has saved"""
        if not request.user.is_authenticated:
            return Response({"error": "Not logged in"}, status=status.HTTP_401_UNAUTHORIZED)

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


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    def get(self, request):
        get_token(request)
        return Response({"message": "CSRF cookie set"}, status=status.HTTP_200_OK)

    