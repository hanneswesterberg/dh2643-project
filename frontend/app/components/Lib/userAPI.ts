import { UserProfileData } from "../userModel";

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
    password: string,
) {
    const form = new FormData();

    form.append("username", username);
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
    return await response.json()
}

export async function removeSavedEvent(eventId: string) {
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

export async function getSavedEvents() {
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

    return data;
}

export async function loadProfile() {
    const response = await fetch(
        `${API}/me/`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error(response.status === 401 ? "Sign in to view your profile." : "Could not load your profile.");
    }

    return await response.json() as UserProfileData;
}

export async function saveEvent(
    eventId: number | null
) {
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
        throw new Error(data.error ?? "Could not remove saved event");
    }

    return data;
}

export async function updateProfile(
    email: string,
    picture: File | null,
    bio: string
) {
    const form = new FormData();

    form.append("email", email);
    if (picture) {
        form.append("profile_picture", picture);
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
