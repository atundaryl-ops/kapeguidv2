"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";

type Role = "staff" | "customer" | null;

type AuthUser = {
    id: string;
    email: string;
    role: Role;
    first_name?: string;
    customer_id?: string;
};

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    async function loadUser() {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setUser(null); setLoading(false); return; }

        // Check if staff
        const { data: staffData } = await supabase
            .from("staff").select("role").eq("id", authUser.id).maybeSingle();

        if (staffData) {
            setUser({ id: authUser.id, email: authUser.email ?? "", role: "staff" });
            setLoading(false);
            return;
        }

        // Check if customer
        const { data: customerData } = await supabase
            .from("customers")
            .select("id, first_name")
            .eq("auth_id", authUser.id)
            .maybeSingle();

        if (customerData) {
            setUser({
                id: authUser.id,
                email: authUser.email ?? "",
                role: "customer",
                first_name: customerData.first_name,
                customer_id: customerData.id,
            });
        } else {
            setUser(null);
        }

        setLoading(false);
    }

    async function logout() {
        await supabase.auth.signOut();
        setUser(null);
    }

    useEffect(() => {
        loadUser();

        // Listen for auth changes (login/logout) — skip INITIAL_SESSION since loadUser() already ran
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "INITIAL_SESSION") return;
            loadUser();
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}