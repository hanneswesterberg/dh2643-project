import { Image } from "ol/source";
import { UserProfileData } from "../userModel";
import { useEffect, useRef, useState } from 'react';
import { Event } from "./definition";
const API = "/api";

export async function logIn(username: string, password: string) {

    const response = await fetch(
        `${API}/users/login`,
        {   method: 'POST',
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
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
    email: string
) {
    const form = new FormData();

    form.append("username", username);
    form.append("password", password);
    form.append("email", email);

    const response = await fetch(
        `${API}/users/register`,
        {
            method: "POST",
            body: form,
            credentials: "include"
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
    return response.json()
}

export async function updateProfile(
    picture: File | null,
    saved_eventIDs: Array<string> | null
) {
    const form = new FormData()

    if (picture) {
        form.append("profile_picture", picture)
    }
    if (saved_eventIDs) {
        form.append("saved_events", JSON.stringify(saved_eventIDs))
    }

    const response = await fetch(
        `${API}/users/update_profile`,
        {
            method: "POST",
            credentials: "include",
            body: form
        }
    )
    return response.json()
}