'use client'
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileData } from "./userModel";
import { loadProfile, updateProfile} from "./Lib/userAPI"

export default function UserProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const response = await loadProfile()
                setProfile(response);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Could not load your profile.");
            }
        }
        void load();
    }, []);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!profile) return;

        setSaving(true);
        setError("");
        setNotice("");
        try {
            const data = await updateProfile(
                profile.email,
                profile.profile_picture,
                profile.bio,
            )
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
