from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient


class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_with_hashed_password_and_profile(self):
        response = self.client.post(
            '/api/users/register/',
            {'username': 'new-user', 'password': 'secure-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='new-user')
        self.assertTrue(user.check_password('secure-password'))
        self.assertTrue(user.profile)

    def test_register_requires_username_and_password(self):
        response = self.client.post('/api/users/register/', {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_register_rejects_existing_username(self):
        User.objects.create_user(username='existing-user', password='secure-password')

        response = self.client.post(
            '/api/users/register/',
            {'username': 'existing-user', 'password': 'another-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.filter(username='existing-user').count(), 1)


class LogoutViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='logged-in-user',
            password='secure-password',
        )

    def test_logout_clears_the_authenticated_session(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

        response = self.client.post('/api/users/logout/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
