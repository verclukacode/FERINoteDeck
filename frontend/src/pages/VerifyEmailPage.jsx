import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo.jsx";
import DuoButton from "../components/DuoButton.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { postAuthDest } from "../lib/postAuthDest.js";

export default function VerifyEmailPage() {
	const { user, logout, resendVerification, reloadUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [resent, setResent] = useState(false);
	const [resending, setResending] = useState(false);
	const [checking, setChecking] = useState(false);
	const [notVerified, setNotVerified] = useState(false);

	async function handleResend() {
		setResending(true);
		try {
			await resendVerification();
			setResent(true);
		} finally {
			setResending(false);
		}
	}

	async function handleContinue() {
		setChecking(true);
		setNotVerified(false);
		await reloadUser();
		if (user.emailVerified) {
			navigate(postAuthDest(location), { replace: true });
		} else {
			setNotVerified(true);
		}
		setChecking(false);
	}

	async function handleSignOut() {
		await logout();
		navigate("/login", { replace: true });
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

				<div className="mb-6 text-center">
					<p className="text-lg font-bold text-title">Check your inbox</p>
					<p className="mt-1 text-sm text-body">
						We sent a verification link to{" "}
						<span className="font-semibold text-title">{user?.email}</span>.
						Click it to activate your account.
					</p>
				</div>

				{notVerified && (
					<p className="mb-3 text-center text-sm text-folder-red">
						Not verified yet - please click the link in your email.
					</p>
				)}

				<div className="flex flex-col gap-3">
					<DuoButton
						type="button"
						onClick={handleContinue}
						disabled={checking}
						className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
					>
						{checking ? "Checking…" : "I've verified, continue"}
					</DuoButton>

					<DuoButton
						type="button"
						onClick={handleResend}
						disabled={resending || resent}
						className="h-[45px] w-full bg-bg text-title shadow-[0_2.5px_0_rgba(0,0,0,0.15)] disabled:opacity-60"
					>
						{resent ? "Email sent!" : resending ? "Sending…" : "Resend email"}
					</DuoButton>

					<button
						type="button"
						onClick={handleSignOut}
						className="py-1 text-sm font-semibold text-folder-blue"
					>
						Sign out
					</button>
				</div>
			</div>
		</div>
	);
}
