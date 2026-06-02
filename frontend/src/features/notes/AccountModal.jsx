import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import pencilIcon from "../../assets/pencil.svg";
import userProfilePic from "../../assets/userProfilePic.svg";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import {
	getStudySettings,
	updateStudySettings,
} from "../../services/flashcardsService.js";
import {
	checkUsername as checkUsernameService,
	setPresetAvatar,
	setUsername as setUsernameService,
	uploadAvatar,
} from "../../services/notesService.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { authErrorMessage } from "../auth/firebaseError.js";
import { useNotes } from "./NotesContext.jsx";

const PRESET_AVATARS = [
	{ url: "/avatars/boy.profile.pic.png", label: "Boy" },
	{ url: null, label: "Default" },
	{ url: "/avatars/girl.profile.pic.png", label: "Girl" },
];

function Row({ icon, label, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-2xl border border-border-soft px-4 py-3.5 text-left hover:bg-bg-secondary"
		>
			<span className="text-body">{icon}</span>
			<span className="flex-1 font-medium text-title">{label}</span>
			<img src="/arrowwr.svg" width={10} height={10} alt="" />
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

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">New email</span>
				<input
					type="email"
					value={newEmail}
					onChange={(e) => setNewEmail(e.target.value)}
					placeholder="new@email.com"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">
					Confirm new email
				</span>
				<input
					type="email"
					value={confirmEmail}
					onChange={(e) => setConfirmEmail(e.target.value)}
					placeholder="new@email.com"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">Current password</span>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Your current password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

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
		<button
			type="button"
			onClick={onClick}
			className="mb-1 flex items-center gap-1 text-sm font-semibold text-folder-blue"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
			</svg>
			Back
		</button>
	);
}

function SuccessState({ title, description }) {
	return (
		<div className="flex flex-col items-center gap-3 py-2 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#16a34a"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
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

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">Current password</span>
				<input
					type="password"
					value={currentPassword}
					onChange={(e) => setCurrentPassword(e.target.value)}
					placeholder="Your current password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">New password</span>
				<input
					type="password"
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
					placeholder="New password"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-title">
					Confirm new password
				</span>
				<input
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					placeholder="New password again"
					required
					className="rounded-full bg-bg-secondary px-4 py-3 text-sm text-title placeholder:text-body/50 outline-none"
				/>
			</label>

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

function ChangeProfilePicPanel({ currentAvatar, onSave, onBack }) {
	const fileInputRef = useRef(null);
	const [selected, setSelected] = useState(currentAvatar);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");

	async function handlePreset(url) {
		setSelected(url);
		setError("");
		try {
			const user = await setPresetAvatar(url);
			onSave(user.avatarUrl);
		} catch {
			setError("Failed to save. Please try again.");
		}
	}

	function compressAvatar(file, maxPx = 512, quality = 0.82) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(objectUrl);
				const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				canvas
					.getContext("2d")
					.drawImage(img, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(
					(blob) =>
						blob
							? resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }))
							: reject(new Error("Compression failed")),
					"image/jpeg",
					quality,
				);
			};
			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				reject(new Error("Could not load image"));
			};
			img.src = objectUrl;
		});
	}

	async function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		setError("");
		try {
			const compressed = await compressAvatar(file);
			const user = await uploadAvatar(compressed);
			setSelected(user.avatarUrl);
			onSave(user.avatarUrl);
		} catch {
			setError("Upload failed. Please try again.");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<BackButton onClick={onBack} />
			<h3 className="text-lg font-bold text-title">Change profile picture</h3>

			<div className="grid grid-cols-3 gap-3">
				{PRESET_AVATARS.map(({ url, label }) => {
					const isSelected = selected === url;
					return (
						<button
							key={label}
							type="button"
							onClick={() => handlePreset(url)}
							className="relative overflow-hidden rounded-full border-[2.5px] transition-colors"
							style={{
								borderColor: isSelected ? "#4a9cf5" : "rgba(0,0,0,0.08)",
							}}
						>
							<img
								src={url ?? userProfilePic}
								alt={label}
								className="aspect-square w-full object-cover"
							/>
							{isSelected && (
								<div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-folder-blue">
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="white"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								</div>
							)}
						</button>
					);
				})}
			</div>

			{error && <p className="text-sm text-folder-red text-center">{error}</p>}

			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium text-body">Or upload your own</p>
				<DuoButton
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading}
					className="h-[45px] w-full bg-bg-secondary text-title shadow-[0_2.5px_0_rgba(0,0,0,0.1)] disabled:opacity-60"
				>
					{uploading ? "Uploading…" : "Upload image"}
				</DuoButton>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>
		</div>
	);
}

function ChangeUsernamePanel({ onBack }) {
	const { username, setUsername: setCtxUsername } = useNotes();
	const [value, setValue] = useState(username ?? "");
	const [status, setStatus] = useState("idle");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const debounceRef = useRef(null);

	const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

	useEffect(() => {
		if (!value || value === username) {
			setStatus("idle");
			return;
		}
		if (!USERNAME_RE.test(value)) {
			setStatus("invalid");
			return;
		}
		setStatus("checking");
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			try {
				const res = await checkUsernameService(value);
				setStatus(res.available ? "available" : "taken");
			} catch {
				setStatus("idle");
			}
		}, 500);
		return () => clearTimeout(debounceRef.current);
	}, [value, username]);

	async function handleSubmit(e) {
		e.preventDefault();
		if (status !== "available") return;
		setError("");
		setLoading(true);
		try {
			await setUsernameService(value);
			setCtxUsername(value.toLowerCase());
			setSuccess(true);
		} catch (err) {
			setError(authErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}

	const hint = {
		idle: null,
		checking: { text: "Checking…", color: "text-body" },
		available: { text: "✓ Available", color: "text-green-500" },
		taken: { text: "Already taken", color: "text-folder-red" },
		invalid: {
			text: "3–20 characters, letters, numbers, underscores only.",
			color: "text-folder-red",
		},
	}[status];

	if (success) {
		return (
			<div className="flex flex-col gap-4">
				<SuccessState
					title="Username updated!"
					description="Your new username is now active."
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
			<h3 className="text-lg font-bold text-title">Change username</h3>
			<div className="flex flex-col gap-1">
				<div className="relative">
					<span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-body">
						@
					</span>
					<input
						type="text"
						value={value}
						onChange={(e) =>
							setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
						}
						placeholder="new_username"
						maxLength={20}
						className="w-full rounded-full bg-bg-secondary py-3 pl-8 pr-4 text-sm text-title placeholder:text-body/50 outline-none"
					/>
				</div>
				{hint && <p className={`pl-2 text-xs ${hint.color}`}>{hint.text}</p>}
			</div>
			{error && <p className="text-sm text-folder-red text-center">{error}</p>}
			<DuoButton
				type="submit"
				disabled={loading || status !== "available"}
				className="mt-2 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
			>
				{loading ? "Saving…" : "Save username"}
			</DuoButton>
		</form>
	);
}

// Parse a "1 10" / "1,10" minutes string into an array of seconds.
function minutesToSec(text) {
	return String(text)
		.split(/[\s,]+/)
		.filter(Boolean)
		.map((m) => Math.round(Number(m) * 60));
}
const secToMinutes = (arr) =>
	(arr ?? []).map((s) => Math.round((s / 60) * 100) / 100).join(" ");

function SettingsField({ label, hint, ...props }) {
	const id = useId();
	return (
		<label htmlFor={id} className="flex flex-col gap-1">
			<span className="text-sm font-medium text-title">{label}</span>
			{hint && <span className="text-xs text-body">{hint}</span>}
			<input
				id={id}
				{...props}
				className="rounded-full bg-bg-secondary px-4 py-2.5 text-sm text-title placeholder:text-body/50 outline-none"
			/>
		</label>
	);
}

function StudySettingsPanel({ onBack }) {
	const [form, setForm] = useState(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		let active = true;
		getStudySettings()
			.then((s) => {
				if (!active) return;
				setForm({
					newCardsPerDay: String(s.newCardsPerDay),
					maxReviewsPerDay: String(s.maxReviewsPerDay),
					learningStepsMin: secToMinutes(s.learningStepsSec),
					relearningStepsMin: secToMinutes(s.relearningStepsSec),
					graduatingIntervalDays: String(s.graduatingIntervalDays),
					easyIntervalDays: String(s.easyIntervalDays),
					startingEase: (s.startingEase / 1000).toFixed(2),
					easyBonus: (s.easyBonusPermille / 1000).toFixed(2),
					hardMultiplier: (s.hardMultiplierPermille / 1000).toFixed(2),
					intervalModifierPct: String(s.intervalModifierPermille / 10),
					maxIntervalDays: String(s.maxIntervalDays),
					newDayStartsAtHour: String(s.newDayStartsAtHour),
				});
			})
			.catch(
				(e) => active && setError(e?.message ?? "Failed to load settings"),
			);
		return () => {
			active = false;
		};
	}, []);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await updateStudySettings({
				newCardsPerDay: Number(form.newCardsPerDay),
				maxReviewsPerDay: Number(form.maxReviewsPerDay),
				learningStepsSec: minutesToSec(form.learningStepsMin),
				relearningStepsSec: minutesToSec(form.relearningStepsMin),
				graduatingIntervalDays: Number(form.graduatingIntervalDays),
				easyIntervalDays: Number(form.easyIntervalDays),
				startingEase: Math.round(Number(form.startingEase) * 1000),
				easyBonusPermille: Math.round(Number(form.easyBonus) * 1000),
				hardMultiplierPermille: Math.round(Number(form.hardMultiplier) * 1000),
				intervalModifierPermille: Math.round(
					Number(form.intervalModifierPct) * 10,
				),
				maxIntervalDays: Number(form.maxIntervalDays),
				newDayStartsAtHour: Number(form.newDayStartsAtHour),
			});
			setSuccess(true);
		} catch (err) {
			setError(err?.message ?? "Couldn't save settings.");
		} finally {
			setLoading(false);
		}
	}

	if (success) {
		return (
			<div className="flex flex-col gap-4">
				<SuccessState
					title="Settings saved!"
					description="Your study defaults have been updated."
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
			<h3 className="text-lg font-bold text-title">Study settings</h3>

			{!form ? (
				<p className="py-6 text-center text-sm text-body">Loading…</p>
			) : (
				<>
					<div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
						<SettingsField
							label="New cards / day"
							type="number"
							min="0"
							value={form.newCardsPerDay}
							onChange={set("newCardsPerDay")}
						/>
						<SettingsField
							label="Max reviews / day"
							type="number"
							min="0"
							value={form.maxReviewsPerDay}
							onChange={set("maxReviewsPerDay")}
						/>
						<SettingsField
							label="Learning steps"
							hint="minutes, e.g. 1 10"
							value={form.learningStepsMin}
							onChange={set("learningStepsMin")}
						/>
						<SettingsField
							label="Relearning steps"
							hint="minutes, e.g. 10"
							value={form.relearningStepsMin}
							onChange={set("relearningStepsMin")}
						/>
						<SettingsField
							label="Graduating interval"
							hint="days"
							type="number"
							min="1"
							value={form.graduatingIntervalDays}
							onChange={set("graduatingIntervalDays")}
						/>
						<SettingsField
							label="Easy interval"
							hint="days"
							type="number"
							min="1"
							value={form.easyIntervalDays}
							onChange={set("easyIntervalDays")}
						/>
						<SettingsField
							label="Starting ease"
							hint="e.g. 2.50"
							type="number"
							step="0.05"
							value={form.startingEase}
							onChange={set("startingEase")}
						/>
						<SettingsField
							label="Easy bonus"
							hint="e.g. 1.30"
							type="number"
							step="0.05"
							value={form.easyBonus}
							onChange={set("easyBonus")}
						/>
						<SettingsField
							label="Hard interval"
							hint="e.g. 1.20"
							type="number"
							step="0.05"
							value={form.hardMultiplier}
							onChange={set("hardMultiplier")}
						/>
						<SettingsField
							label="Interval modifier"
							hint="percent, e.g. 100"
							type="number"
							value={form.intervalModifierPct}
							onChange={set("intervalModifierPct")}
						/>
						<SettingsField
							label="Max interval"
							hint="days"
							type="number"
							min="1"
							value={form.maxIntervalDays}
							onChange={set("maxIntervalDays")}
						/>
						<SettingsField
							label="New day starts at"
							hint="hour, 0–23"
							type="number"
							min="0"
							max="23"
							value={form.newDayStartsAtHour}
							onChange={set("newDayStartsAtHour")}
						/>
					</div>

					{error && (
						<p className="text-center text-sm text-folder-red">{error}</p>
					)}

					<DuoButton
						type="submit"
						disabled={loading}
						className="mt-1 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
					>
						{loading ? "Saving…" : "Save settings"}
					</DuoButton>
				</>
			)}
		</form>
	);
}

export default function AccountModal({ onClose }) {
	const { user, logout } = useAuth();
	const { avatarUrl, setAvatarUrl, username } = useNotes();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [panel, setPanel] = useState(null);

	useEffect(() => {}, []);

	useEffect(() => {
		const onKey = (e) =>
			e.key === "Escape" && (panel ? setPanel(null) : onClose());
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, panel]);

	function handleCopy() {
		navigator.clipboard.writeText(username);
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

				{panel === "username" ? (
					<ChangeUsernamePanel onBack={() => setPanel(null)} />
				) : panel === "email" ? (
					<ChangeEmailPanel onBack={() => setPanel(null)} />
				) : panel === "password" ? (
					<ChangePasswordPanel onBack={() => setPanel(null)} />
				) : panel === "study-settings" ? (
					<StudySettingsPanel onBack={() => setPanel(null)} />
				) : panel === "avatar" ? (
					<ChangeProfilePicPanel
						currentAvatar={avatarUrl}
						onSave={(url) => {
							setAvatarUrl(url);
							setPanel(null);
						}}
						onBack={() => setPanel(null)}
					/>
				) : (
					<>
						{/* Avatar */}
						<div className="mb-4 flex flex-col items-center gap-2">
							<div className="relative inline-block">
								<img
									src={avatarUrl ?? userProfilePic}
									width={80}
									height={80}
									alt="Your avatar"
									className="h-20 w-20 rounded-full object-cover"
								/>
								<button
									type="button"
									aria-label="Edit profile picture"
									onClick={() => setPanel("avatar")}
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

						{/* Username display */}
						<div className="mb-3 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
							<div>
								<p className="text-xs text-body">Username</p>
								<p className="font-semibold text-title">{username}</p>
							</div>
							<button
								type="button"
								onClick={handleCopy}
								title="Copy username"
								className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-secondary text-body hover:bg-border-soft"
							>
								{copied ? <CheckIcon /> : <CopyIcon />}
							</button>
						</div>

						{/* Action rows */}
						<div className="flex flex-col gap-2 mb-4">
							<Row
								icon={<PersonIcon size={18} />}
								label="Change username"
								onClick={() => setPanel("username")}
							/>
							<Row
								icon={<MailIcon />}
								label="Change email"
								onClick={() => setPanel("email")}
							/>
							<Row
								icon={<LockIcon />}
								label="Change password"
								onClick={() => setPanel("password")}
							/>
							<Row
								icon={<Icon name="study-hat" size={18} />}
								label="Study settings"
								onClick={() => setPanel("study-settings")}
							/>
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
