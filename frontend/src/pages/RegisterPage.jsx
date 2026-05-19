import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo.jsx";
import DuoButton from "../components/DuoButton.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { authErrorMessage } from "../features/auth/firebaseError.js";

export default function RegisterPage() {
	const { register } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (!email || !password || !confirm) {
			setError("Please fill in all fields.");
			return;
		}
		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await register(email, password);
			navigate("/", { replace: true });
		} catch (err) {
			setError(authErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-full items-center justify-center bg-bg p-4">
			<div className="w-full max-w-sm rounded-3xl bg-bg-secondary p-10">
				<div className="mb-8 flex items-center justify-center gap-3">
					<AppLogo />
					<div>
						<p className="text-sm text-body leading-tight">Welcome to</p>
						<p className="text-2xl font-bold text-title leading-tight">
							NoteDeck
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="register-email"
							className="text-sm font-medium text-title"
						>
							Email adress
						</label>
						<input
							id="register-email"
							type="email"
							placeholder="example@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label
							htmlFor="register-password"
							className="text-sm font-medium text-title"
						>
							Password
						</label>
						<input
							id="register-password"
							type="password"
							placeholder="NoPassword123"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label
							htmlFor="register-confirm"
							className="text-sm font-medium text-title"
						>
							Password again
						</label>
						<input
							id="register-confirm"
							type="password"
							placeholder="NoPassword123"
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						/>
					</div>

					{error && (
						<p className="text-sm text-folder-red text-center">{error}</p>
					)}

					<div className="mt-4 flex flex-col items-center gap-3">
						<DuoButton
							type="submit"
							disabled={loading}
							className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
						>
							{loading ? "Signing up…" : "Sign up"}
						</DuoButton>
						<Link to="/login" className="text-sm font-medium text-folder-blue">
							Already have an account
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
