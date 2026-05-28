import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo.jsx";
import DuoButton from "../components/DuoButton.jsx";
import { postAuthDest } from "../lib/postAuthDest.js";
import { checkUsername, getMe, setUsername } from "../services/notesService.js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function ChooseUsernamePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const dest = postAuthDest(location);
	const [value, setValue] = useState("");

	// If user already has a username, skip this page
	useEffect(() => {
		getMe()
			.then((me) => {
				if (me?.username) navigate(dest, { replace: true });
			})
			.catch(() => {});
	}, [navigate, dest]);

	const [status, setStatus] = useState("idle"); // idle | checking | available | taken | invalid | error
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef(null);

	useEffect(() => {
		if (!value) {
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
				const res = await checkUsername(value);
				setStatus(res.available ? "available" : "taken");
			} catch {
				setStatus("error");
			}
		}, 500);

		return () => clearTimeout(debounceRef.current);
	}, [value]);

	async function handleSubmit(e) {
		e.preventDefault();
		if (status !== "available") return;
		setError("");
		setLoading(true);
		try {
			await setUsername(value);
			navigate(dest, { replace: true });
		} catch (err) {
			setError(err.message ?? "Something went wrong.");
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
		error: {
			text: "Couldn't check that username. Try again.",
			color: "text-folder-red",
		},
	}[status];

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

				<div className="mb-6">
					<p className="text-lg font-bold text-title">Choose a username</p>
					<p className="mt-1 text-sm text-body">
						This is how others will find and recognize you.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-body">
								@
							</span>
							<input
								type="text"
								value={value}
								onChange={(e) =>
									setValue(
										e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
									)
								}
								placeholder="your_username"
								maxLength={20}
								autoFocus
								className="w-full rounded-full bg-bg py-3 pl-8 pr-4 text-sm text-title placeholder:text-body/50 outline-none"
							/>
						</div>
						{hint && (
							<p className={`pl-2 text-xs ${hint.color}`}>{hint.text}</p>
						)}
					</div>

					{error && (
						<p className="text-sm text-folder-red text-center">{error}</p>
					)}

					<DuoButton
						type="submit"
						disabled={loading || status !== "available"}
						className="h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
					>
						{loading ? "Saving…" : "Continue"}
					</DuoButton>
				</form>
			</div>
		</div>
	);
}
