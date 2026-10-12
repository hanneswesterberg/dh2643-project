import json

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import UserProfile


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
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

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


class CurrentUserAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='account-user',
            email='old@example.com',
            password='secure-password',
        )

    def test_put_replaces_username_and_email_and_can_change_password(self):
        self.client.force_login(self.user)

        response = self.client.put(
            '/api/users/me/',
            {
                'username': 'updated-user',
                'email': 'updated@example.com',
                'password': 'another-secure-password',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'username': 'updated-user', 'email': 'updated@example.com'},
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('another-secure-password'))
        self.assertFalse(self.user.check_password('secure-password'))
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

    def test_put_requires_username_and_email(self):
        self.client.force_login(self.user)

        response = self.client.put(
            '/api/users/me/',
            {'username': 'updated-user'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'account-user')

    def test_patch_updates_only_provided_fields(self):
        self.client.force_login(self.user)

        response = self.client.patch(
            '/api/users/me/',
            {'email': 'updated@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'account-user')
        self.assertEqual(self.user.email, 'updated@example.com')

    def test_update_rejects_an_existing_username(self):
        User.objects.create_user(username='taken-user', password='secure-password')
        self.client.force_login(self.user)

        response = self.client.patch(
            '/api/users/me/',
            {'username': 'taken-user'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'account-user')

    def test_update_requires_authentication(self):
        response = self.client.patch(
            '/api/users/me/',
            {'email': 'updated@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'old@example.com')

    def test_delete_removes_user_and_profile_and_clears_session(self):
        UserProfile.objects.create(user=self.user)
        self.client.force_login(self.user)

        response = self.client.delete('/api/users/me/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(UserProfile.objects.filter(user_id=self.user.pk).exists())
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)

    def test_delete_requires_authentication(self):
        response = self.client.delete('/api/users/me/')

        self.assertEqual(response.status_code, 401)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
