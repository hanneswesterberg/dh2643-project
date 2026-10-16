import json
from io import BytesIO
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from django.test import TestCase
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from PIL import Image
from events.models import Genre
from .models import UserProfile


class UserProfileTests(TestCase):
    def test_profile_stores_social_account_details(self):
        user = User.objects.create_user(
            username='profile-user',
            email='profile@example.com',
            password='secure-password',
        )
        genre = Genre.objects.create(name='Jazz')
        profile = UserProfile.objects.create(
            user=user,
            display_name='Profile User',
            profile_picture='https://example.com/profile.jpg',
            bio='A short profile bio.',
            location='Stockholm',
            website='https://example.com',
        )
        profile.favorite_genres.add(genre)

        profile.refresh_from_db()
        self.assertEqual(profile.user.username, 'profile-user')
        self.assertEqual(profile.user.email, 'profile@example.com')
        self.assertTrue(profile.user.check_password('secure-password'))
        self.assertEqual(profile.display_name, 'Profile User')
        self.assertEqual(profile.profile_picture, 'https://example.com/profile.jpg')
        self.assertEqual(profile.bio, 'A short profile bio.')
        self.assertEqual(profile.location, 'Stockholm')
        self.assertEqual(profile.website, 'https://example.com')
        self.assertEqual(list(profile.favorite_genres.all()), [genre])
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)


class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_with_hashed_password_and_profile(self):
        response = self.client.post(
            '/api/users/register/',
            {'username': 'new-user', 'password': 'secure-password', 'email': 'new-user@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='new-user')
        self.assertEqual(user.email, 'new-user@example.com')
        self.assertTrue(user.check_password('secure-password'))
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_register_requires_username_and_password(self):
        response = self.client.post('/api/users/register/', {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_register_rejects_blank_or_non_string_credentials(self):
        response = self.client.post(
            '/api/users/register/',
            {'username': '   ', 'password': '   '},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

        response = self.client.post(
            '/api/users/register/',
            {'username': 123, 'password': ['not', 'a', 'string']},
            format='json',
        )

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


class LoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='login-user',
            email='login@example.com',
            password='secure-password',
        )

    def test_login_accepts_username(self):
        response = self.client.post(
            '/api/users/login/',
            {'username': 'login-user', 'password': 'secure-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

    def test_login_accepts_email_as_username_value(self):
        response = self.client.post(
            '/api/users/login/',
            {'username': 'login@example.com', 'password': 'secure-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

    def test_login_accepts_email_field(self):
        response = self.client.post(
            '/api/users/login/',
            {'email': 'login@example.com', 'password': 'secure-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

    def test_login_rejects_ambiguous_email(self):
        User.objects.create_user(
            username='another-login-user',
            email='login@example.com',
            password='secure-password',
        )

        response = self.client.post(
            '/api/users/login/',
            {'email': 'login@example.com', 'password': 'secure-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)


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
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        media_settings = override_settings(MEDIA_ROOT=self.media_directory.name)
        media_settings.enable()
        self.addCleanup(media_settings.disable)
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
            {
                'username': 'updated-user',
                'email': 'updated@example.com',
                'display_name': '',
                'profile_picture': '',
                'bio': '',
                'location': '',
                'website': '',
            },
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
            {
                'email': 'updated@example.com',
                'profile_picture': 'https://example.com/new-profile.jpg',
                'bio': 'A new bio',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'account-user')
        self.assertEqual(self.user.email, 'updated@example.com')
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.profile_picture, 'https://example.com/new-profile.jpg')
        self.assertEqual(profile.bio, 'A new bio')

    def test_bio_preserves_allowed_formatting_and_removes_unsafe_markup(self):
        self.client.force_login(self.user)

        response = self.client.patch(
            '/api/users/me/',
            {'bio': '<b onclick="alert(1)">Bold</b><i>Italic</i><u>Underlined</u><script>alert(2)</script>'},
            format='json',
        )

        expected_bio = '<b>Bold</b><i>Italic</i><u>Underlined</u>'
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['bio'], expected_bio)
        self.assertEqual(UserProfile.objects.get(user=self.user).bio, expected_bio)

    def test_bio_character_limit_counts_text_not_formatting_markup(self):
        self.client.force_login(self.user)
        bio = f'<b>{"x" * 500}</b>'

        response = self.client.patch(
            '/api/users/me/',
            {'bio': bio},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['bio'], bio)

        response = self.client.patch(
            '/api/users/me/',
            {'bio': f'<b>{"x" * 501}</b>'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)

    def test_update_rejects_invalid_profile_picture_url(self):
        self.client.force_login(self.user)

        response = self.client.patch(
            '/api/users/me/',
            {'profile_picture': 'not-a-url'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'old@example.com')

    def test_profile_picture_upload_accepts_png_and_jpeg_and_persists_file(self):
        self.client.force_login(self.user)

        for image_format, extension, content_type in (
            ('PNG', 'png', 'image/png'),
            ('JPEG', 'jpg', 'image/jpeg'),
        ):
            image_bytes = BytesIO()
            Image.new('RGB', (1, 1), color='red').save(image_bytes, format=image_format)
            upload = SimpleUploadedFile(
                f'avatar.{extension}',
                image_bytes.getvalue(),
                content_type=content_type,
            )

            response = self.client.patch(
                '/api/users/me/',
                {'profile_picture': upload},
                format='multipart',
            )

            self.assertEqual(response.status_code, 200)
            self.user.refresh_from_db()
            profile = UserProfile.objects.get(user=self.user)
            self.assertEqual(
                Path(self.media_directory.name, profile.profile_picture_image.name).read_bytes(),
                image_bytes.getvalue(),
            )
            picture_url = json.loads(response.content)['profile_picture']
            self.assertIn('/media/profile_pictures/', picture_url)
            self.assertEqual(urlsplit(picture_url).path, profile.profile_picture_image.url)

    def test_profile_picture_upload_rejects_files_over_2mb(self):
        self.client.force_login(self.user)
        upload = SimpleUploadedFile(
            'too-large.png',
            b'x' * (2 * 1024 * 1024 + 1),
            content_type='image/png',
        )

        response = self.client.patch(
            '/api/users/me/',
            {'profile_picture': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('2 MB or smaller', response.content.decode())
        self.assertFalse(UserProfile.objects.filter(user=self.user).exists())

    def test_profile_picture_upload_rejects_non_png_and_non_jpeg_images(self):
        self.client.force_login(self.user)
        image_bytes = BytesIO()
        Image.new('RGB', (1, 1), color='red').save(image_bytes, format='GIF')
        upload = SimpleUploadedFile(
            'avatar.gif',
            image_bytes.getvalue(),
            content_type='image/gif',
        )

        response = self.client.patch(
            '/api/users/me/',
            {'profile_picture': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('PNG or JPEG', response.content.decode())
        self.assertFalse(UserProfile.objects.filter(user=self.user).exists())

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
