import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo.jsx";
import DuoButton from "../components/DuoButton.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { authErrorMessage } from "../features/auth/firebaseError.js";

function ForgotPasswordForm({ onBack }) {
	const [resetEmail, setResetEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (!resetEmail) return;
		setLoading(true);
		// TODO: call backend reset-password endpoint when available
		// await fetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: resetEmail }) });
		setLoading(false);
		setSubmitted(true);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			{submitted ? (
				<p className="text-sm text-body text-center py-2">
					If an account exists for <span className="font-semibold text-title">{resetEmail}</span>,
					a reset link will be sent to that address.
				</p>
			) : (
				<div className="flex flex-col gap-1">
					<label htmlFor="forgot-email" className="text-sm font-medium text-title">
						Email address
					</label>
					<input
						id="forgot-email"
						type="email"
						placeholder="example@email.com"
						value={resetEmail}
						onChange={(e) => setResetEmail(e.target.value)}
						className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
						autoFocus
					/>
				</div>
			)}

			<div className="mt-4 flex flex-col items-center gap-2">
				{!submitted && (
					<DuoButton
						type="submit"
						disabled={loading || !resetEmail}
						className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
					>
						{loading ? "Sending…" : "Send reset link"}
					</DuoButton>
				)}
				<button
					type="button"
					onClick={onBack}
					className="text-sm font-semibold text-folder-blue py-1"
				>
					Back to log in
				</button>
			</div>
		</form>
	);
}

export default function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [showForgot, setShowForgot] = useState(false);

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
						<p className="text-2xl font-bold text-title leading-tight">NoteDeck</p>
					</div>
				</div>

				{showForgot ? (
					<ForgotPasswordForm onBack={() => setShowForgot(false)} />
				) : (
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<label htmlFor="login-email" className="text-sm font-medium text-title">
								Email address
							</label>
							<input
								id="login-email"
								type="email"
								placeholder="example@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label htmlFor="login-password" className="text-sm font-medium text-title">
								Password
							</label>
							<input
								id="login-password"
								type="password"
								placeholder="NoPassword123"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="rounded-full bg-bg px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
							/>
						</div>

						{error && <p className="text-sm text-folder-red text-center">{error}</p>}

						<div className="mt-4 flex flex-col items-center gap-2">
							<DuoButton
								type="submit"
								disabled={loading}
								className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
							>
								{loading ? "Logging in…" : "Log in"}
							</DuoButton>
							<button
								type="button"
								onClick={() => setShowForgot(true)}
								className="text-sm font-semibold text-folder-blue py-1"
							>
								Forgot password
							</button>
							<Link to="/register" className="text-sm font-semibold text-folder-blue py-1">
								Sign up
							</Link>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
