import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

function Row({ icon, label, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-2xl border border-border-soft px-4 py-3.5 text-left hover:bg-bg-secondary"
		>
			<span className="text-body">{icon}</span>
			<span className="flex-1 font-medium text-title">{label}</span>
			<Icon name="chevron" size={16} className="text-body" />
		</button>
	);
}

export default function AccountModal({ onClose }) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

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
					className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-body hover:bg-border-soft"
				>
					<Icon name="xmark" size={14} />
				</button>

				{/* Avatar */}
				<div className="mb-4 flex flex-col items-center gap-2">
					<div className="relative">
						<div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary text-body">
							<PersonIcon />
						</div>
						<button
							type="button"
							className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-title text-bg"
						>
							<PencilIcon />
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
					<Row icon={<MailIcon />} label="Change email" />
					<Row icon={<LockIcon />} label="Change password" />
					<Row icon={<PersonIcon size={18} />} label="A rabmo se kj?" />
				</div>

				{/* Sign out */}
				<button
					type="button"
					onClick={handleSignOut}
					className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 font-semibold text-folder-red hover:bg-red-100"
				>
					<SignOutIcon />
					Sign out
				</button>

				<button
					type="button"
					onClick={onClose}
					className="w-full py-2 text-sm text-body hover:text-title"
				>
					Close
				</button>
			</div>
		</div>
	);
}

function PersonIcon({ size = 36 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
		</svg>
	);
}

function PencilIcon() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
		</svg>
	);
}

function CopyIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
		</svg>
	);
}

function MailIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
		</svg>
	);
}

function LockIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z" />
		</svg>
	);
}

function SignOutIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z" />
		</svg>
	);
}
