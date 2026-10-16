"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getCurrentUser, type AuthUser } from "./userAPI";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
    status: AuthStatus;
    user: AuthUser | null;
    error: string | null;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refreshAuth = useCallback(async () => {
        setStatus("loading");
        setError(null);

        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setStatus(currentUser ? "authenticated" : "unauthenticated");
        } catch (authError) {
            const message = authError instanceof Error
                ? authError.message
                : "Could not verify your sign-in status.";
            setUser(null);
            setError(message);
            setStatus("error");
            throw authError instanceof Error ? authError : new Error(message);
        }
    }, []);

    useEffect(() => {
        void refreshAuth().catch(() => undefined);
    }, [refreshAuth]);

    return (
        <AuthContext.Provider value={{ status, user, error, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }
    return context;
}
