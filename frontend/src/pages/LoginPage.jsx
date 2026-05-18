import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";
import AppLogo from "../components/AppLogo.jsx";

export default function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (!email || !password) {
			setError("Please fill in all fields.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await login(email, password);
			navigate("/", { replace: true });
		} catch (err) {
			setError(err.message);
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
						<p className="text-2xl font-bold text-title leading-tight">NoteDeck</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<label className="text-sm font-medium text-title">Email adress</label>
						<input
							type="email"
							placeholder="example@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-sm font-medium text-title">Password</label>
						<input
							type="password"
							placeholder="NoPassword123"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						/>
					</div>

					{error && <p className="text-sm text-folder-red text-center">{error}</p>}

					<div className="mt-4 flex flex-col items-center gap-3">
						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-full bg-folder-blue py-3 text-sm font-semibold text-white disabled:opacity-60"
						>
							{loading ? "Logging in…" : "Log in"}
						</button>
						<Link to="/register" className="text-sm font-medium text-folder-blue">
							Forgot password
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
