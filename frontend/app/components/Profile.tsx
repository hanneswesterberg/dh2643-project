'use client'
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileData } from "./userModel";

function getCsrfToken() {
    return document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.split("=")[1] ?? "";
}

export default function UserProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await fetch("/api/users/me/", { credentials: "include" });
                if (!response.ok) {
                    throw new Error(response.status === 401 ? "Sign in to view your profile." : "Could not load your profile.");
                }
                setProfile(await response.json() as UserProfileData);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Could not load your profile.");
            }
        }
        void loadProfile();
    }, []);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!profile) return;

        setSaving(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/users/me/", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": decodeURIComponent(getCsrfToken()),
                },
                body: JSON.stringify({
                    email: profile.email,
                    display_name: profile.display_name,
                    profile_picture: profile.profile_picture,
                    bio: profile.bio,
                    location: profile.location,
                    website: profile.website,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                const message = Object.values(data).flat().join(" ");
                throw new Error(message || "Could not save your profile.");
            }
            setProfile(data as UserProfileData);
            setNotice("Profile updated.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
        } finally {
            setSaving(false);
        }
    }

    function updateField(field: keyof UserProfileData, value: string) {
        setProfile((current) => current ? { ...current, [field]: value } : current);
    }

    if (!profile) {
        return <p role="status">{error || "Loading profile..."}</p>;
    }

    return (
        <section className="mx-auto max-w-xl space-y-5 p-6">
            <h1 className="text-2xl font-semibold">Your profile</h1>
            {profile.profile_picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_picture} alt="Profile picture" className="img_round" />
            )}
            <p>Username: {profile.username}</p>

            <form onSubmit={saveProfile} className="space-y-4">
                <label className="block">
                    Email
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        value={profile.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Display name
                    <input
                        value={profile.display_name}
                        onChange={(event) => updateField("display_name", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Profile picture URL
                    <input
                        type="url"
                        value={profile.profile_picture}
                        onChange={(event) => updateField("profile_picture", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Bio
                    <textarea
                        value={profile.bio}
                        onChange={(event) => updateField("bio", event.target.value)}
                        maxLength={500}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Location
                    <input
                        value={profile.location}
                        onChange={(event) => updateField("location", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Website
                    <input
                        type="url"
                        value={profile.website}
                        onChange={(event) => updateField("website", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>

                {error && <p role="alert">{error}</p>}
                {notice && <p role="status">{notice}</p>}
                <button type="submit" disabled={saving} className="rounded border px-4 py-2">
                    {saving ? "Saving..." : "Save profile"}
                </button>
            </form>
            <button onClick={() => router.push("/")} className="rounded border px-4 py-2">
                Go back
            </button>
        </section>
    );
}
