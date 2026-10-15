const API = "/api";


export async function logIn(username: string, password: string) {
    const response = await fetch(
        `${API}/users/login`,
        {   method: 'POST',
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
        `${API}/users/register`,
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
        `${API}/users/logout`,
        {
            method: "POST",
            credentials: "include"
        }
    )
    return await response.json()
}

export async function updatePicture(
    picture: File | null,
) {
   
    const response = await fetch(
        `${API}/users/ADDENDPOINT` //TODO: add actual endpoint
    )

    return response.json()
}

export async function saveEvent(
    eventId: number | null
) {
    const response = await fetch(
        `${API}/users/saved-events/${eventId}/`,
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

export async function removeSavedEvent(eventId: string) {
    const response = await fetch(
        `${API}/users/saved-events/${eventId}/`,
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