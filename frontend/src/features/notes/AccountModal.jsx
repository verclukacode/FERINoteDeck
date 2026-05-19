import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { authErrorMessage } from "../auth/firebaseError.js";
import userProfilePic from "../../assets/userProfilePic.svg";
import pencilIcon from "../../assets/pencil.svg";
import arrowIcon from "../../assets/arrow.svg";

function Row({ icon, label, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-2xl border border-border-soft px-4 py-3.5 text-left hover:bg-bg-secondary"
		>
			<span className="text-body">{icon}</span>
			<span className="flex-1 font-medium text-title">{label}</span>
			<img src={arrowIcon} width={26} height={26} alt="" />
		</button>
	);
}

function ChangeEmailPanel({ onBack }) {
	const { changeEmail, logout } = useAuth();
	const navigate = useNavigate();
	const [newEmail, setNewEmail] = useState("");
	const [confirmEmail, setConfirmEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (newEmail !== confirmEmail) {
			setError("Emails do not match.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await changeEmail(newEmail, password);
			setSuccess(true);
		} catch (err) {
			setError(authErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}

	async function handleSignOutAfterChange() {
		await logout();
		navigate("/login", { replace: true });
	}

	if (success) {
		return (
			<div className="flex flex-col gap-4">
				<SuccessState
					title="Verification sent!"
					description={`Click the link in ${newEmail}, then sign back in with your new email.`}
				/>
				<DuoButton
					type="button"
					onClick={handleSignOutAfterChange}
					className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
				>
					Sign out
				</DuoButton>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<BackButton onClick={onBack} />
			<h3 className="text-lg font-bold text-title">Change email</h3>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">New email</label>
				<input
					type="email"
					value={newEmail}
					onChange={(e) => setNewEmail(e.target.value)}
					placeholder="new@email.com"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">Confirm new email</label>
				<input
					type="email"
					value={confirmEmail}
					onChange={(e) => setConfirmEmail(e.target.value)}
					placeholder="new@email.com"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">Current password</label>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Your current password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			{error && <p className="text-sm text-folder-red text-center">{error}</p>}

			<DuoButton
				type="submit"
				disabled={loading}
				className="mt-2 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
			>
				{loading ? "Sending…" : "Send verification link"}
			</DuoButton>
		</form>
	);
}

function BackButton({ onClick }) {
	return (
		<button type="button" onClick={onClick} className="mb-1 flex items-center gap-1 text-sm font-semibold text-folder-blue">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
			Back
		</button>
	);
}

function SuccessState({ title, description }) {
	return (
		<div className="flex flex-col items-center gap-3 py-2 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			</div>
			<div>
				<p className="font-bold text-title">{title}</p>
				<p className="mt-1 text-sm text-body">{description}</p>
			</div>
		</div>
	);
}

function ChangePasswordPanel({ onBack }) {
	const { changePassword } = useAuth();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await changePassword(currentPassword, newPassword);
			setSuccess(true);
		} catch (err) {
			setError(authErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}

	if (success) {
		return (
			<div className="flex flex-col gap-4">
				<SuccessState
					title="Password changed!"
					description="Your password has been updated. You can continue using the app."
				/>
				<DuoButton
					type="button"
					onClick={onBack}
					className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
				>
					Back to account
				</DuoButton>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<BackButton onClick={onBack} />
			<h3 className="text-lg font-bold text-title">Change password</h3>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">Current password</label>
				<input
					type="password"
					value={currentPassword}
					onChange={(e) => setCurrentPassword(e.target.value)}
					placeholder="Your current password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">New password</label>
				<input
					type="password"
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
					placeholder="New password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-title">Confirm new password</label>
				<input
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					placeholder="New password again"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</div>

			{error && <p className="text-sm text-folder-red text-center">{error}</p>}

			<DuoButton
				type="submit"
				disabled={loading}
				className="mt-2 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
			>
				{loading ? "Updating…" : "Update password"}
			</DuoButton>
		</form>
	);
}

export default function AccountModal({ onClose }) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [panel, setPanel] = useState(null);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && (panel ? setPanel(null) : onClose());
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, panel]);

	function handleCopy() {
		navigator.clipboard.writeText(user?.email ?? "");
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	async function handleSignOut() {
		await logout();
		navigate("/login", { replace: true });
	}

	return (
		<div className="absolute inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-black/15"
			/>
			<div className="relative w-[460px] rounded-[30px] border-[2.5px] border-border-soft bg-bg p-6 shadow-[0_5px_0_rgba(0,0,0,0.12)]">
				{/* Close X */}
				<button
					type="button"
					onClick={onClose}
					className="absolute right-8 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-body hover:bg-border-soft"
				>
					<Icon name="xmark" size={14} />
				</button>

				{panel === "email" ? (
					<ChangeEmailPanel onBack={() => setPanel(null)} />
				) : panel === "password" ? (
					<ChangePasswordPanel onBack={() => setPanel(null)} />
				) : (
					<>
						{/* Avatar */}
						<div className="mb-4 flex flex-col items-center gap-2">
							<div className="relative inline-block">
								<img src={userProfilePic} width={80} height={80} alt="Profile picture" />
								<button
									type="button"
									aria-label="Edit profile picture"
									className="absolute -bottom-1 -right-1"
								>
									<img src={pencilIcon} width={28} height={28} alt="" />
								</button>
							</div>
							<div className="text-center">
								<h2 className="text-xl font-bold text-title">My account</h2>
								<p className="text-sm text-body">
									Manage your account settings and preferences.
								</p>
							</div>
						</div>

						<div className="mb-3 h-px bg-border-soft" />

						{/* Email display */}
						<div className="mb-3 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
							<div>
								<p className="text-xs text-body">Email address</p>
								<p className="font-semibold text-title">{user?.email ?? ""}</p>
							</div>
							<button
								type="button"
								onClick={handleCopy}
								title="Copy email"
								className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-secondary text-body hover:bg-border-soft"
							>
								{copied ? <CheckIcon /> : <CopyIcon />}
							</button>
						</div>

						{/* Action rows */}
						<div className="flex flex-col gap-2 mb-4">
							<Row icon={<MailIcon />} label="Change email" onClick={() => setPanel("email")} />
							<Row icon={<LockIcon />} label="Change password" onClick={() => setPanel("password")} />
							<Row icon={<PersonIcon size={18} />} label="Change profile picture" />
						</div>

						{/* Sign out */}
						<DuoButton
							type="button"
							onClick={handleSignOut}
							className="mb-2 flex h-[45px] w-full items-center justify-center gap-2 bg-folder-red text-white shadow-[0_2.5px_0_#c45252]"
						>
							<SignOutIcon />
							Sign out
						</DuoButton>

						<button
							type="button"
							onClick={onClose}
							className="w-full py-2 text-sm text-body hover:text-title"
						>
							Close
						</button>
					</>
				)}
			</div>
		</div>
	);
}

function PersonIcon({ size = 36 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
		</svg>
	);
}

function CopyIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
		</svg>
	);
}

function MailIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
		</svg>
	);
}

function LockIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z" />
		</svg>
	);
}

function SignOutIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z" />
		</svg>
	);
}
