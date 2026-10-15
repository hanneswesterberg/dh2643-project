import { UserProfileData } from "../userModel";

const API = "/api/users";


export async function logIn(username: string, password: string) {
    const response = await fetch(
        `${API}/login/`,
        {   
            method: 'POST',
            credentials: 'include',
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
            credentials: "include"
        }
    )
    return await response.json()
}

export async function removeSavedEvent(eventId: string) {
    const response = await fetch(
        `${API}/saved-events/${eventId}/`,
        {
            method: "DELETE",
            credentials: "include"
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
            credentials: "include" 
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
            credentials: "include"
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
    picture: string,
    bio: string,
    CSRF: string
) {
    const form = new FormData();

    form.append("email", email);
    form.append("profile_picture", picture);
    form.append("bio", bio);

    const response = await fetch(
        `${API}/me/`,
        {
            method: "PATCH",
            credentials: "include",
            headers:
            {
                "Content-Type": "application/json",
                "X-CSRFToken": CSRF,
            },
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