import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	sendEmailVerification,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../../lib/firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		return onAuthStateChanged(auth, (u) => {
			setUser(u);
			setLoading(false);
		});
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			login: (email, password) =>
				signInWithEmailAndPassword(auth, email, password),
			register: async (email, password) => {
				const cred = await createUserWithEmailAndPassword(auth, email, password);
				await sendEmailVerification(cred.user);
				return cred;
			},
			resendVerification: () => sendEmailVerification(auth.currentUser),
			reloadUser: () => auth.currentUser?.reload(),
			logout: () => signOut(auth),
		}),
		[user, loading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
