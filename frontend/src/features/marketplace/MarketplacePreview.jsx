import { useEffect, useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import {
	getMarketplaceDeck,
	getMarketplaceNote,
} from "../../services/marketplaceService.js";
import { contentToHtml } from "../notes/editor/inlineFormat.js";
import NoteReadView from "./NoteReadView.jsx";
import { buildMarketplaceLink } from "./marketplaceLink.js";

function CardField({ value, className = "" }) {
	return (
		<p
			className={`mt-1 whitespace-pre-wrap break-words text-sm ${className}`}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: contentToHtml escapes user input and only renders bold, URL autolinks, and KaTeX math
			dangerouslySetInnerHTML={{ __html: contentToHtml(value || "—") }}
		/>
	);
}

function DeckContent({ cards }) {
	if (!cards?.length) {
		return <p className="text-sm text-body">This deck has no cards yet.</p>;
	}
	return (
		<ol className="flex flex-col gap-3">
			{cards.map((c, i) => (
				<li
					key={c.id}
					className="rounded-2xl border-[2.5px] border-border-soft bg-bg p-4"
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-body">
						Question {i + 1}
					</p>
					<CardField value={c.question} className="font-medium text-title" />
					<div className="my-3 h-[2.5px] rounded-full bg-border-soft" />
					<p className="text-xs font-semibold uppercase tracking-wide text-body">
						Answer
					</p>
					<CardField value={c.answer} className="text-title" />
				</li>
			))}
		</ol>
	);
}

// Right-pane preview of a single marketplace item. Loads the full payload on
// `(kind, id)` change and shows a Clone button that opens the folder picker.
export default function MarketplacePreview({ kind, id, onClone }) {
	const [item, setItem] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(buildMarketplaceLink({ kind, id }));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setError("Couldn't copy link");
		}
	}

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError("");
		const fetcher = kind === "note" ? getMarketplaceNote : getMarketplaceDeck;
		fetcher(id)
			.then((data) => {
				if (!active) return;
				setItem(data);
			})
			.catch((e) => {
				if (!active) return;
				setError(e?.message ?? "Failed to load");
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [kind, id]);

	if (loading) {
		return <div className="p-6 text-center text-body">Loading…</div>;
	}
	if (error) {
		return <div className="p-6 text-center text-folder-red">{error}</div>;
	}
	if (!item) return null;

	const title = kind === "note" ? item.title : item.name;

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-start gap-4 border-b-[2.5px] border-border-soft px-6 py-5">
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<Icon
							name={kind === "note" ? "document" : "flashcards"}
							size={18}
							className="shrink-0 text-body"
						/>
						<h3 className="min-w-0 truncate text-xl font-bold text-title">
							{title}
						</h3>
					</div>
					{item.publicDescription && (
						<p className="mt-1 text-sm text-body">{item.publicDescription}</p>
					)}
					<div className="mt-2 flex items-center gap-2">
						<img
							src={item.author?.avatarUrl ?? userProfilePic}
							alt=""
							width={24}
							height={24}
							className="h-6 w-6 rounded-full object-cover"
						/>
						<span className="text-xs font-medium text-body">
							@{item.author?.username ?? "anonymous"}
						</span>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onClick={copyLink}
						aria-label="Copy link"
						className="flex h-[40px] items-center gap-1.5 rounded-full border-[2.5px] border-border-soft bg-bg px-4 text-sm font-semibold text-title"
					>
						{copied ? "Copied!" : "Copy link"}
					</button>
					<DuoButton
						type="button"
						onClick={onClone}
						className="h-[40px] bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
					>
						Clone
					</DuoButton>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-6 py-5">
				{kind === "note" ? (
					<NoteReadView content={item.content} />
				) : (
					<DeckContent cards={item.cards} />
				)}
			</div>
		</div>
	);
}
