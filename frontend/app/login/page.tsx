"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logIn } from "../components/Lib/userAPI";
import { useAuth } from "../components/Lib/AuthContext";

export default function Login() {
    const router = useRouter();
    const { refreshAuth } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsLoggingIn(true);

        try {
            const result = await logIn(username, password);
            if (!result.ok) {
                setError(
                    typeof result.data?.error === "string"
                        ? result.data.error
                        : "Could not log in. Check your username and password.",
                );
                return;
            }
            await refreshAuth();
            router.replace("/");
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : "Could not log in.");
        } finally {
            setIsLoggingIn(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-md space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Log in</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                    Username
                    <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Password
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>

                {error && <p role="alert">{error}</p>}
                <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="rounded border px-4 py-2"
                >
                    {isLoggingIn ? "Logging in..." : "Log in"}
                </button>
            </form>
        </main>
    );
}
