import { SavedEvent, UserProfileData } from "../userModel";

const API = "/api/users";
const EVENTS_API = "/api/events";

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

async function getCSRFHeader(): Promise<Record<string, string>> {
    let csrfToken = getCookie("csrftoken");
    if (!csrfToken) {
        await fetch(`${API}/csrf/`, { credentials: "include" });
        csrfToken = getCookie("csrftoken");
    }
    return csrfToken ? { "X-CSRFToken": csrfToken } : {};
}

export async function logIn(username: string, password: string) {
    const response = await fetch(
        `${API}/login/`,
        {   
            method: 'POST',
            credentials: 'include',
            headers: {
                ...(await getCSRFHeader()),
                "Content-Type": "application/json",
            }, 
            body: JSON.stringify({
                username,
                password
            })
        }
    )
    return {
        ok: response.ok,
        data: await response.json()
    }
}

export async function signUp(
    username: string,
    email: string,
    password: string,
) {
    const form = new FormData();

    form.append("username", username);
    form.append("email", email);
    form.append("password", password);

    const response = await fetch(
        `${API}/register/`,
        {
            method: "POST",
            credentials: "include",
            headers: await getCSRFHeader(),
            body: form
        }
    )
    return {
        ok: response.ok,
        data: await response.json()
    }
}

export async function logOut() {
    const response = await fetch(
        `${API}/logout/`,
        {
            method: "POST",
            credentials: "include",
            headers: await getCSRFHeader(),
        }
    )
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error ?? "Could not log out.");
    }
    return data;
}

export async function deleteAccount() {
    const response = await fetch(
        `${API}/me/`,
        {
            method: "DELETE",
            credentials: "include",
            headers: await getCSRFHeader(),
        }
    );

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not delete your account.");
    }
}

export async function removeSavedEvent(eventId: number) {
    const response = await fetch(
        `${API}/saved-events/${eventId}/`,
        {
            method: "DELETE",
            credentials: "include",
            headers: await getCSRFHeader(),
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error ?? "Could not remove saved event");
    }

    return data;
}

export async function getSavedEvents(): Promise<SavedEvent[]> {
    const response = await fetch(
        `${API}/saved-events/`,
        {
            method: "GET",
            credentials: "include",
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error ?? "Could not load saved events");
    }

    return data as SavedEvent[];
}

export async function getCurrentUser(): Promise<UserProfileData | null> {
    const response = await fetch(
        `${API}/me/`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (response.status === 401) {
        return null;
    }
    if (!response.ok) {
        throw new Error("Could not check your sign-in status.");
    }

    return await response.json() as UserProfileData;
}

export async function loadProfile() {
    const profile = await getCurrentUser();
    if (!profile) {
        throw new Error("Sign in to view your profile.");
    }
    return profile;
}

export async function saveEvent(eventId: number) {
    const response = await fetch(
        `${API}/saved-events/${eventId}/`,
        {
            method: "POST",
            credentials: "include",
            headers: await getCSRFHeader(),
        }
    )

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error ?? "Could not save event");
    }

    return data;
}

export async function updateProfile(
    username: string,
    displayName: string,
    email: string,
    picture: File | null,
    originalPicture: File | null,
    bio: string,
) {
    const form = new FormData();

    form.append("username", username);
    form.append("display_name", displayName);
    form.append("email", email);
    if (picture) {
        form.append("profile_picture", picture);
    }
    if (originalPicture) {
        form.append("profile_picture_original", originalPicture);
    }
    form.append("bio", bio);

    const response = await fetch(
        `${API}/me/`,
        {
            method: "PATCH",
            credentials: "include",
            headers: await getCSRFHeader(), 
            body: form
        }
    );
    
    const data = await response.json();
    if (!response.ok) {
        const message = Object.values(data).flat().join(" ");
        throw new Error(message || "Could not save your profile.");
    }
    return data;
}

export async function updatePassword(password: string) {
    const form = new FormData();
    form.append("password", password);

    const response = await fetch(`${API}/me/`, {
        method: "PATCH",
        credentials: "include",
        headers: await getCSRFHeader(),
        body: form,
    });
    const data = await response.json();
    if (!response.ok) {
        const message = Object.values(data).flat().join(" ");
        throw new Error(message || "Could not update your password.");
    }
    return data;
}

export async function checkUsernameAvailability(
    username: string,
    signal: AbortSignal,
): Promise<boolean> {
    const response = await fetch(
        `${API}/check-username/?username=${encodeURIComponent(username)}`,
        {
            credentials: "include",
            signal,
        },
    );
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error ?? "Could not check username availability.");
    }
    if (typeof data.available !== "boolean") {
        throw new Error("The username availability response was invalid.");
    }
    return data.available;
}

export async function searchGlobal(query: string) {
    const response = await fetch(
        `${EVENTS_API}/search?q=${encodeURIComponent(query)}`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error("Could not fetch search results");
    }

    return await response.json();
}
