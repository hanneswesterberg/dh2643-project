'use client'
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileData } from "./userModel";
import { loadProfile, logOut, updateProfile } from "./Lib/userAPI"
import { useAuth } from "./Lib/AuthContext";

export default function UserProfile() {
    const router = useRouter();
    const { refreshAuth } = useAuth();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [saving, setSaving] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [bioLength, setBioLength] = useState(0);
    const bioEditor = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (bioEditor.current && bioEditor.current.innerHTML !== profile?.bio) {
            bioEditor.current.innerHTML = profile?.bio ?? "";
            setBioLength(bioEditor.current.innerText.length);
        }
    }, [profile?.bio]);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!profile) return;

        setSaving(true);
        setError("");
        setNotice("");
        try {
            const data = await updateProfile(
                profile.email,
                pictureFile,
                profile.bio,
            )
            setProfile(data as UserProfileData);
            setPictureFile(null);
            setNotice("Profile updated.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
        } finally {
            setSaving(false);
        }
    }

    async function handleLogOut() {
        setLoggingOut(true);
        setError("");
        try {
            await logOut();
            await refreshAuth();
            router.replace("/");
        } catch (logoutError) {
            setError(logoutError instanceof Error ? logoutError.message : "Could not log out.");
        } finally {
            setLoggingOut(false);
        }
    }

    function updateField(field: keyof UserProfileData, value: string) {
        setProfile((current) => current ? { ...current, [field]: value } : current);
    }

    function updateBioFromEditor() {
        const editor = bioEditor.current;
        if (editor) {
            updateField("bio", editor.innerHTML);
            setBioLength(editor.innerText.length);
        }
    }

    function formatBio(command: "bold" | "italic" | "underline") {
        bioEditor.current?.focus();
        document.execCommand(command, false);
        updateBioFromEditor();
    }

    if (!profile) {
        return error ? 
        ( <p role="alert">{error}</p>) : 
        (
            <div role="status" className="flex items-center gap-3 p-6">
                <span
                    aria-hidden="true"
                    className="loadingSpin"
                />
            </div>
        );
    }

    return (
        <section className="w-full min-w-0 max-w-full space-y-4 p-3">
            <h1 className="text-xl font-semibold">Your profile</h1>
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
                    Profile picture (PNG or JPEG, max 2 MB)
                    <input
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onChange={(event) => {
                            const file = event.currentTarget.files?.[0] ?? null;
                            if (file && file.size > 2 * 1024 * 1024) {
                                setPictureFile(null);
                                event.currentTarget.value = "";
                                setError("Profile pictures must be 2 MB or smaller.");
                                return;
                            }
                            if (
                                file &&
                                !["image/png", "image/jpeg"].includes(file.type) &&
                                !/\.(png|jpe?g)$/i.test(file.name)
                            ) {
                                setPictureFile(null);
                                event.currentTarget.value = "";
                                setError("Choose a PNG or JPEG image.");
                                return;
                            }
                            setError("");
                            setPictureFile(file);
                        }}
                        className="mt-1 block w-full rounded border p-2"
                    />
                    {pictureFile && <span className="mt-1 block">{pictureFile.name}</span>}
                </label>
                <div className="block">
                    Bio
                    <div role="toolbar" aria-label="Bio formatting" className="mt-1 flex gap-2">
                        <button
                            type="button"
                            aria-label="Bold"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("bold")}
                            className="rounded border px-2 py-1 font-bold"
                        >
                            B
                        </button>
                        <button
                            type="button"
                            aria-label="Italic"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("italic")}
                            className="rounded border px-2 py-1 italic"
                        >
                            I
                        </button>
                        <button
                            type="button"
                            aria-label="Underline"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("underline")}
                            className="rounded border px-2 py-1 underline"
                        >
                            U
                        </button>
                    </div>
                    <div
                        ref={bioEditor}
                        role="textbox"
                        aria-label="Bio"
                        aria-multiline="true"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={updateBioFromEditor}
                        className="mt-1 min-h-28 w-full rounded border p-2"
                    />
                    <p className="mt-1 text-sm text-gray-600">
                        {bioLength}/500 characters
                    </p>
                </div>

                {error && <p role="alert">{error}</p>}
                {notice && <p role="status">{notice}</p>}
                <button type="submit" disabled={saving} className="rounded border px-4 py-2">
                    {saving ? "Saving..." : "Save profile"}
                </button>
            </form>
            <button onClick={() => router.push("/")} className="rounded border px-4 py-2">
                Go back
            </button>
            <button
                type="button"
                onClick={handleLogOut}
                disabled={loggingOut}
                className="rounded border px-4 py-2"
            >
                {loggingOut ? "Signing out..." : "Sign out"}
            </button>
        </section>
    );
}
