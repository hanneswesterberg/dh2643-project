import http.cookiejar
import json
import os
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid


API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


class LiveAPIClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies),
        )
        self.csrf_token = None

    def request(
        self,
        method,
        path,
        data=None,
        authenticated=False,
        accept="application/json",
    ):
        headers = {"Accept": accept}
        body = None
        if data is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(data).encode("utf-8")
        if authenticated and self.csrf_token:
            headers["X-CSRFToken"] = self.csrf_token

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers=headers,
            method=method,
        )
        try:
            response = self.opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error

        with response:
            content = response.read()
            content_type = response.headers.get("Content-Type", "")
        parsed = json.loads(content) if content else None
        return response.status, parsed, content_type


class LiveAPIContractTests(unittest.TestCase):
    def setUp(self):
        self.client = LiveAPIClient(API_BASE_URL)
        suffix = uuid.uuid4().hex[:12]
        self.username = f"api-contract-{suffix}"
        self.password = f"ApiTest-{uuid.uuid4().hex}-!Q"

    def assert_json_response(self, response, expected_status):
        status_code, body, content_type = response
        self.assertEqual(status_code, expected_status, f"Unexpected API response: {body!r}")
        self.assertIn("application/json", content_type)
        return body

    def assert_error_object(self, response, expected_status):
        body = self.assert_json_response(response, expected_status)
        self.assertIsInstance(body, dict)
        self.assertTrue(body)
        return body

    def assert_method_not_allowed(self, method, path, authenticated=False):
        body = self.assert_error_object(
            self.client.request(method, path, authenticated=authenticated),
            405,
        )
        self.assertIsInstance(body.get("detail"), str)

    def assert_not_acceptable(self, method, path, authenticated=False):
        body = self.assert_error_object(
            self.client.request(
                method,
                path,
                authenticated=authenticated,
                accept="application/xml",
            ),
            406,
        )
        self.assertIsInstance(body.get("detail"), str)

    def assert_string_fields(self, data, fields):
        self.assertIsInstance(data, dict)
        for field in fields:
            self.assertIn(field, data)
            self.assertIsInstance(data[field], str)

    def login(self):
        return self.client.request(
            "POST",
            "/api/users/login/",
            {"username": self.username, "password": self.password},
        )

    def delete_test_user(self):
        status_code, _, _ = self.client.request(
            "DELETE",
            "/api/users/me/",
            authenticated=True,
        )
        if status_code == 403:
            self.refresh_csrf()
            status_code, _, _ = self.client.request(
                "DELETE",
                "/api/users/me/",
                authenticated=True,
            )
        if status_code == 401:
            status_code, _, _ = self.login()
        if status_code == 200:
            self.refresh_csrf()
            self.client.request("DELETE", "/api/users/me/", authenticated=True)

    def refresh_csrf(self):
        self.assert_json_response(
            self.client.request("GET", "/api/users/csrf/"),
            200,
        )
        self.client.csrf_token = next(
            (cookie.value for cookie in self.client.cookies if cookie.name == "csrftoken"),
            None,
        )
        self.assertIsNotNone(self.client.csrf_token)

    def test_all_api_routes_and_methods(self):
        try:
            root = self.assert_json_response(
                self.client.request("GET", "/api/"),
                200,
            )
            self.assert_string_fields(root, ("current_user", "events"))
            self.assert_not_acceptable("GET", "/api/")
            self.assert_method_not_allowed("POST", "/api/")

            csrf = self.assert_json_response(
                self.client.request("GET", "/api/users/csrf/"),
                200,
            )
            self.assert_string_fields(csrf, ("message",))
            self.refresh_csrf()
            self.assert_not_acceptable("GET", "/api/users/csrf/")
            self.assert_method_not_allowed("POST", "/api/users/csrf/")

            self.assert_error_object(
                self.client.request("GET", "/api/users/check-username/"),
                401,
            )
            self.assert_error_object(
                self.client.request("GET", "/api/users/me/"),
                401,
            )
            self.assert_error_object(
                self.client.request("GET", "/api/users/saved-events/"),
                401,
            )
            for method in ("PUT", "PATCH", "DELETE"):
                self.assert_error_object(
                    self.client.request(method, "/api/users/me/", data={}, authenticated=True),
                    401,
                )
            for method, path in (
                ("POST", "/api/users/saved-events/1/"),
                ("DELETE", "/api/users/saved-events/1/"),
            ):
                self.assert_error_object(
                    self.client.request(method, path, authenticated=True),
                    401,
                )

            register_data = {
                "username": self.username,
                "email": f"{self.username}@example.test",
                "password": self.password,
            }
            registered = self.assert_json_response(
                self.client.request("POST", "/api/users/register/", register_data),
                201,
            )
            self.assert_string_fields(registered, ("message",))
            self.assert_error_object(
                self.client.request("POST", "/api/users/register/", {}),
                400,
            )
            self.assert_error_object(
                self.client.request("POST", "/api/users/register/", register_data),
                400,
            )
            self.assert_method_not_allowed("GET", "/api/users/register/")

            logged_in = self.assert_json_response(self.login(), 200)
            self.assert_string_fields(logged_in, ("message",))
            self.refresh_csrf()
            invalid_login = self.assert_error_object(
                self.client.request(
                    "POST",
                    "/api/users/login/",
                    {"username": self.username, "password": "incorrect-password"},
                    authenticated=True,
                ),
                401,
            )
            self.assertIsInstance(invalid_login.get("error"), str)
            logged_out = self.assert_json_response(
                self.client.request("POST", "/api/users/logout/", authenticated=True),
                200,
            )
            self.assert_string_fields(logged_out, ("message",))
            self.assert_not_acceptable(
                "POST",
                "/api/users/logout/",
                authenticated=True,
            )
            self.assert_method_not_allowed("GET", "/api/users/logout/")
            self.assert_json_response(self.login(), 200)
            self.refresh_csrf()

            availability = self.assert_json_response(
                self.client.request(
                    "GET",
                    f"/api/users/check-username/?{urllib.parse.urlencode({'username': self.username})}",
                ),
                200,
            )
            self.assertEqual(availability, {"available": True})
            self.assert_error_object(
                self.client.request("GET", "/api/users/check-username/"),
                400,
            )

            account = self.assert_json_response(
                self.client.request("GET", "/api/users/me/"),
                200,
            )
            self.assert_string_fields(
                account,
                (
                    "username",
                    "email",
                    "display_name",
                    "profile_picture",
                    "profile_picture_original",
                    "bio",
                    "location",
                    "website",
                ),
            )
            updated_account = {
                "username": self.username,
                "email": f"{self.username}@example.test",
                "display_name": "API Contract Tester",
                "bio": "<b>Integration test</b>",
                "location": "Stockholm",
                "website": "https://example.test",
            }
            put_result = self.assert_json_response(
                self.client.request(
                    "PUT",
                    "/api/users/me/",
                    updated_account,
                    authenticated=True,
                ),
                200,
            )
            self.assertEqual(put_result["display_name"], "API Contract Tester")
            self.assert_error_object(
                self.client.request(
                    "PUT",
                    "/api/users/me/",
                    {**updated_account, "website": "not a URL"},
                    authenticated=True,
                ),
                400,
            )
            patch_result = self.assert_json_response(
                self.client.request(
                    "PATCH",
                    "/api/users/me/",
                    {"display_name": "Patched API Tester"},
                    authenticated=True,
                ),
                200,
            )
            self.assertEqual(patch_result["display_name"], "Patched API Tester")
            self.assert_error_object(
                self.client.request(
                    "PATCH",
                    "/api/users/me/",
                    {"website": "not a URL"},
                    authenticated=True,
                ),
                400,
            )

            saved_events = self.assert_json_response(
                self.client.request("GET", "/api/users/saved-events/"),
                200,
            )
            self.assertIsInstance(saved_events, list)

            for search_path in ("/api/events/search", "/api/events/search/"):
                search = self.assert_json_response(
                    self.client.request("GET", f"{search_path}?q=api-contract-no-match"),
                    200,
                )
                self.assertEqual(set(search), {"artists", "genres", "venues"})
                for results in search.values():
                    self.assertIsInstance(results, list)
                    for result in results:
                        self.assertIsInstance(result.get("id"), int)
                        self.assertIsInstance(result.get("name"), str)
                self.assert_not_acceptable("GET", search_path)
                self.assert_method_not_allowed(
                    "POST",
                    search_path,
                    authenticated=True,
                )

            event_collection = self.assert_json_response(
                self.client.request("GET", "/api/events/"),
                200,
            )
            self.assertEqual(event_collection.get("type"), "FeatureCollection")
            self.assertIsInstance(event_collection.get("features"), list)
            self.assert_not_acceptable("GET", "/api/events/")
            self.assert_method_not_allowed(
                "POST",
                "/api/events/",
                authenticated=True,
            )
            self.assertTrue(
                event_collection["features"],
                "Live API contract tests require at least one event with coordinates.",
            )

            event = event_collection["features"][0]
            event_properties = event.get("properties")
            self.assert_string_fields(
                event_properties,
                (
                    "tickster_id",
                    "name",
                    "start",
                    "ticket_url",
                    "image_url",
                    "venue_name",
                    "genres",
                ),
            )
            self.assertIsInstance(event.get("id"), int)
            self.assertIsInstance(event_properties.get("artists"), list)
            self.assertEqual(event.get("type"), "Feature")
            self.assertIsInstance(event.get("geometry"), dict)
            event_id = event["id"]
            event_detail = self.assert_json_response(
                self.client.request("GET", f"/api/events/{event_id}"),
                200,
            )
            self.assertEqual(event_detail["type"], "Feature")
            self.assertEqual(event_detail["id"], event_id)
            self.assert_not_acceptable("GET", f"/api/events/{event_id}")
            self.assert_error_object(
                self.client.request("GET", "/api/events/2147483647"),
                404,
            )
            self.assert_method_not_allowed(
                "POST",
                f"/api/events/{event_id}",
                authenticated=True,
            )

            saved = self.assert_json_response(
                self.client.request(
                    "POST",
                    f"/api/users/saved-events/{event_id}/",
                    authenticated=True,
                ),
                201,
            )
            self.assert_string_fields(saved, ("message",))
            missing_event = self.assert_error_object(
                self.client.request(
                    "POST",
                    "/api/users/saved-events/2147483647/",
                    authenticated=True,
                ),
                404,
            )
            self.assertIsInstance(missing_event.get("error"), str)
            saved_events = self.assert_json_response(
                self.client.request("GET", "/api/users/saved-events/"),
                200,
            )
            self.assertTrue(any(item.get("id") == event_id for item in saved_events))
            self.assert_json_response(
                self.client.request(
                    "DELETE",
                    f"/api/users/saved-events/{event_id}/",
                    authenticated=True,
                ),
                200,
            )
            self.assert_error_object(
                self.client.request(
                    "DELETE",
                    "/api/users/saved-events/2147483647/",
                    authenticated=True,
                ),
                404,
            )
            self.assert_json_response(
                self.client.request("GET", "/api/users/saved-events/"),
                200,
            )
            deleted_status, deleted_body, _ = self.client.request(
                "DELETE",
                "/api/users/me/",
                authenticated=True,
            )
            self.assertEqual(deleted_status, 204)
            self.assertIsNone(deleted_body)
        finally:
            self.delete_test_user()
