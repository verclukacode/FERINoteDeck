import { useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {
	const [menuOpen, setMenuOpen] = useState(false);
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-8 sm:py-4">
			<Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
				<img
					src="/favicon.svg"
					alt="NoteDeck"
					className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
				/>
				<span className="truncate text-lg font-bold text-gray-900 sm:text-xl">
					NoteDeck
				</span>
			</Link>

			{/* Desktop: Duo-style buttons inline */}
			<div className="hidden shrink-0 items-center gap-3 sm:flex">
				<Link
					to="/login"
					className="inline-flex h-11 items-center justify-center rounded-full border-[2.5px] border-gray-200 bg-white px-5 text-sm font-bold text-gray-700 shadow-[0_2.5px_0_rgba(0,0,0,0.08)] transition-transform active:translate-y-[2.5px] active:[box-shadow:none]"
				>
					Log in
				</Link>
				<Link
					to="/register"
					className="inline-flex h-11 items-center justify-center rounded-full border-[2.5px] border-black/10 bg-[#f4845f] px-5 text-sm font-bold text-white shadow-[0_2.5px_0_#d4623d] transition-transform active:translate-y-[2.5px] active:[box-shadow:none]"
				>
					Get started
				</Link>
			</div>

			{/* Mobile: hamburger that opens a small dropdown */}
			<div className="relative shrink-0 sm:hidden">
				<button
					type="button"
					onClick={() => setMenuOpen((v) => !v)}
					aria-label="Open menu"
					className="flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-gray-200 bg-white text-gray-700 shadow-[0_2.5px_0_rgba(0,0,0,0.08)]"
				>
					<span className="flex flex-col gap-1">
						<span className="block h-[2px] w-5 rounded-full bg-gray-700" />
						<span className="block h-[2px] w-5 rounded-full bg-gray-700" />
						<span className="block h-[2px] w-5 rounded-full bg-gray-700" />
					</span>
				</button>
				{menuOpen && (
					<>
						<button
							type="button"
							aria-label="Close menu"
							onClick={() => setMenuOpen(false)}
							className="fixed inset-0 z-40 cursor-default"
						/>
						<div className="absolute right-0 top-full z-50 mt-2 flex w-44 flex-col overflow-hidden rounded-2xl border-[2.5px] border-gray-100 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
							<Link
								to="/login"
								onClick={() => setMenuOpen(false)}
								className="px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
							>
								Log in
							</Link>
							<Link
								to="/register"
								onClick={() => setMenuOpen(false)}
								className="border-t border-gray-100 bg-[#f4845f]/10 px-4 py-3 text-sm font-bold text-[#f4845f]"
							>
								Get started
							</Link>
						</div>
					</>
				)}
			</div>
		</nav>
	);
}

function Screenshot({
	src,
	alt,
	zoom = "center",
	scale,
	origin = "center center",
	className = "",
}) {
	return (
		<div
			className={`relative overflow-hidden rounded-2xl shadow-2xl bg-gray-50 ${className}`}
			style={{ border: "2.5px solid #e5e7eb" }}
		>
			{/* key={src} forces React to remount the <img> when the source
			    changes — the previous onError handler used to set
			    style.display="none" on the element and that style stuck around
			    after a successful src swap, leaving the image hidden. */}
			<img
				key={src}
				src={src}
				alt={alt}
				className="absolute inset-0 h-full w-full object-cover"
				style={{
					objectPosition: zoom,
					...(scale
						? { transform: `scale(${scale})`, transformOrigin: origin }
						: {}),
				}}
				onError={(e) => {
					e.currentTarget.style.visibility = "hidden";
				}}
			/>
		</div>
	);
}

const TOOLS = [
	{ bg: "#4255ff", label: "Q", title: "Quizlet" },
	{ bg: "#1b8cff", label: "A", title: "Anki" },
	{ bg: "#000", label: "N", title: "Notion", rounded: true },
	{ bg: "#5c93c9", label: "✏", title: "Notes" },
	{ bg: "#185abd", label: "W", title: "Word" },
	{ bg: "#e22a22", label: "A", title: "Acrobat" },
	{ bg: "#7b5ea7", label: "O", title: "Obsidian" },
	{ bg: "#00a82d", label: "E", title: "Evernote" },
];

// RemNote-style feature section: colored title word + sub-items (one active) + screenshot
// Each item has its own screenshot — clicking an item swaps the image on the right.
function FeatureSection({
	coloredWord,
	titleRest,
	color,
	description,
	items,
	reverse = false,
}) {
	const [active, setActive] = useState(0);
	const current = items[active];
	return (
		<section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
			<div
				className={`flex flex-col items-center gap-8 sm:gap-12 lg:gap-16 ${
					reverse ? "lg:flex-row-reverse" : "lg:flex-row"
				}`}
			>
				{/* Text */}
				<div className="flex w-full flex-1 flex-col gap-4 sm:gap-5">
					<h2 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
						<span style={{ color }}>{coloredWord}</span> {titleRest}
					</h2>
					<p className="text-base leading-relaxed text-gray-500 sm:text-lg">
						{description}
					</p>
					<div className="mt-1 flex flex-col gap-2">
						{items.map((item, i) => (
							<button
								key={item.title}
								type="button"
								onClick={() => setActive(i)}
								className={`flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all sm:gap-4 sm:px-4 sm:py-4 ${
									active === i ? "bg-gray-50 shadow-sm" : "hover:bg-gray-50/60"
								}`}
								style={
									active === i
										? { border: "2.5px solid #e5e7eb" }
										: { border: "2.5px solid transparent" }
								}
							>
								<div
									className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
									style={{ background: `${color}15`, color }}
								>
									{item.icon}
								</div>
								<div className="min-w-0">
									<p className="font-semibold text-gray-900">{item.title}</p>
									<p className="mt-0.5 text-sm text-gray-500">
										{item.description}
									</p>
								</div>
							</button>
						))}
					</div>
					<Link
						to="/register"
						className="mt-2 inline-flex h-11 w-fit items-center justify-center gap-1 rounded-full border-[2.5px] px-5 text-sm font-bold text-white shadow-[0_2.5px_0_rgba(0,0,0,0.15)] transition-transform active:translate-y-[2.5px] active:[box-shadow:none]"
						style={{
							background: color,
							borderColor: "rgba(0,0,0,0.1)",
							boxShadow: `0 2.5px 0 ${color}80`,
						}}
					>
						Try it now →
					</Link>
				</div>

				{/* Screenshot — swaps based on active item */}
				<div className="w-full flex-1">
					<Screenshot
						src={current.screenshot}
						alt={current.title}
						zoom={current.zoom ?? "top center"}
						scale={current.scale}
						origin={current.origin}
						className="aspect-[4/3] w-full"
					/>
				</div>
			</div>
		</section>
	);
}

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white font-sans">
			<Navbar />

			{/* Hero */}
			<section
				className="px-4 pt-24 pb-12 text-center sm:px-6 sm:pt-32 sm:pb-20"
				style={{
					background:
						"linear-gradient(160deg, #fff8f5 0%, #f0f4ff 50%, #fff 100%)",
				}}
			>
				<div className="mx-auto flex max-w-3xl flex-col items-center gap-5 sm:gap-6">
					<span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-1.5 text-xs font-semibold text-orange-500 sm:text-sm">
						✦ Your all-in-one study companion
					</span>
					<h1 className="text-3xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
						Notes, flashcards <span style={{ color: "#f4845f" }}>and more</span>
						<br className="hidden sm:inline" /> in one place
					</h1>
					<p className="max-w-xl text-base leading-relaxed text-gray-500 sm:text-xl">
						Write rich notes, study with spaced repetition flashcards, generate
						content with AI, and collaborate with your classmates — all in
						NoteDeck.
					</p>
					<div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
						<Link
							to="/register"
							className="inline-flex h-12 items-center justify-center rounded-full border-[2.5px] border-black/10 bg-[#f4845f] px-8 text-base font-bold text-white shadow-[0_3px_0_#d4623d] transition-transform active:translate-y-[3px] active:[box-shadow:none]"
						>
							Get started for free
						</Link>
						<Link
							to="/login"
							className="inline-flex h-12 items-center justify-center rounded-full border-[2.5px] border-gray-200 bg-white px-8 text-base font-bold text-gray-700 shadow-[0_3px_0_rgba(0,0,0,0.08)] transition-transform active:translate-y-[3px] active:[box-shadow:none]"
						>
							Log in
						</Link>
					</div>
				</div>

				{/* Hero screenshot */}
				<div className="mx-auto mt-8 max-w-5xl sm:mt-14">
					<div
						className="relative overflow-hidden rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.12)]"
						style={{ border: "2.5px solid #e5e7eb" }}
					>
						<img
							src="/screenshots/hero.png"
							alt="NoteDeck app"
							className="w-full object-cover object-top"
							onError={(e) => {
								e.target.style.display = "none";
							}}
						/>
						<div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
					</div>
				</div>
			</section>

			{/* Divider */}
			<div className="max-w-5xl mx-auto px-6">
				<div className="h-px bg-gray-100" />
			</div>

			{/* Notes */}
			<FeatureSection
				coloredWord="Notes"
				titleRest="that build understanding"
				color="#7c8ff5"
				description="Write structured, beautiful notes that help you truly understand — not just memorize."
				items={[
					{
						icon: "📝",
						title: "Block-based editor",
						description:
							"Text, headings, bullet & numbered lists, checklists, images and separators.",
						screenshot: "/screenshots/notes-editor.png",
						zoom: "top left",
					},
					{
						icon: "📁",
						title: "Color-coded folders",
						description:
							"Keep all your notes organized in a structure that makes sense to you.",
						screenshot: "/screenshots/notes-folders.png",
						zoom: "top left",
					},
					{
						icon: "📄",
						title: "Export to PDF",
						description: "Download any note as a clean PDF with one click.",
						screenshot: "/screenshots/notes-pdf.png",
						zoom: "top center",
					},
				]}
			/>

			{/* Flashcards */}
			<section
				style={{
					background: "linear-gradient(135deg, #f8f9ff 0%, #fff5f2 100%)",
				}}
			>
				<FeatureSection
					coloredWord="Flashcards"
					titleRest="that make you remember"
					color="#f4845f"
					description="Study smarter with a proven spaced repetition system. NoteDeck shows you each card at exactly the right moment."
					items={[
						{
							icon: "🧠",
							title: "Anki-style SM-2 algorithm",
							description:
								"Cards come back at the perfect interval — right before you forget.",
							screenshot: "/screenshots/flashcards-deck.png",
							zoom: "top center",
						},
						{
							icon: "🔥",
							title: "Streak & daily stats",
							description:
								"Track your streak, accuracy and time to stay motivated.",
							screenshot: "/screenshots/flashcards-stats.png",
							zoom: "top center",
						},
						{
							icon: "✅",
							title: "Rate 1–4 or True/False",
							description:
								"Two card types for every kind of knowledge you need to learn.",
							screenshot: "/screenshots/flashcards-study.png",
							zoom: "top center",
						},
					]}
					reverse={true}
				/>
			</section>

			{/* AI */}
			<FeatureSection
				coloredWord="AI"
				titleRest="that does the heavy lifting"
				color="#9b6cf5"
				description="Let AI handle the boring parts — uploading files, creating flashcards and building test decks — so you can focus on learning."
				items={[
					{
						icon: "✨",
						title: "Generate notes from files",
						description:
							"Upload PDF, DOCX, PPTX or images and get a structured note in seconds.",
						screenshot: "/screenshots/ai-import.png",
						zoom: "center center",
					},
					{
						icon: "🃏",
						title: "Create flashcards from notes",
						description:
							"One click turns any note into a ready-to-study flashcard deck.",
						screenshot: "/screenshots/ai-flashcards.png",
						zoom: "center center",
					},
					{
						icon: "📋",
						title: "Generate test decks",
						description:
							"Combine notes, decks and files into one comprehensive test.",
						screenshot: "/screenshots/generate-test.png",
						zoom: "center center",
					},
				]}
			/>

			{/* Sharing */}
			<section
				style={{
					background: "linear-gradient(135deg, #fff8f0 0%, #f0f4ff 100%)",
				}}
			>
				<FeatureSection
					coloredWord="Sharing"
					titleRest="built for students"
					color="#f5a623"
					description="Learning is better together. Share notes and decks directly with classmates or publish them for the whole community."
					items={[
						{
							icon: "👤",
							title: "Direct sharing by @username",
							description:
								"Send a note or deck to any user — they can view and edit it.",
							screenshot: "/screenshots/sharing.png",
							zoom: "center top",
						},
						{
							icon: "🌍",
							title: "Publish to the Marketplace",
							description:
								"Make your best notes public so others can discover and clone them.",
							screenshot: "/screenshots/marketplace.png",
							zoom: "top center",
							scale: 1.65,
							origin: "38% 42%",
						},
						{
							icon: "🔔",
							title: "Notification inbox",
							description:
								"Accept or decline incoming note and deck invites from one place.",
							screenshot: "/screenshots/nottifications.png",
							zoom: "center center",
						},
					]}
					reverse={true}
				/>
			</section>

			{/* Calendar */}
			<FeatureSection
				coloredWord="Calendar"
				titleRest="to stay on top of deadlines"
				color="#e85d5d"
				description="Never miss an exam or deadline. NoteDeck's built-in calendar keeps your study schedule organized and sends you timely reminders."
				items={[
					{
						icon: "📅",
						title: "Month & week view",
						description:
							"Switch between month and week view to plan ahead or focus on the current week.",
						screenshot: "/screenshots/calendar.png",
						zoom: "top center",
					},
					{
						icon: "🏷️",
						title: "Color-coded tags",
						description:
							"Organize events by type — Exams, Practice, Deadlines — each with its own color.",
						screenshot: "/screenshots/calendar-tags.png",
						zoom: "top center",
					},
					{
						icon: "⚠️",
						title: "Upcoming event warnings",
						description:
							"Get warned about events in the next 3 days directly in the app.",
						screenshot: "/screenshots/calendar-warnings.png",
						zoom: "top center",
					},
				]}
			/>

			{/* Marketplace + AI Chat */}
			<section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
					<div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:gap-5 sm:p-8">
						<span className="inline-flex w-fit items-center rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-green-500">
							Marketplace
						</span>
						<h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
							Discover community content
						</h3>
						<p className="text-sm text-gray-500 sm:text-base">
							Browse public notes and flashcard decks from other students.
							Preview and clone anything into your workspace in one click.
						</p>
						<Screenshot
							src="/screenshots/marketplace.png"
							alt="Marketplace"
							zoom="top center"
							scale={1.65}
							origin="38% 42%"
							className="mt-2 aspect-[4/3] w-full"
						/>
					</div>
					<div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:gap-5 sm:p-8">
						<span className="inline-flex w-fit items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-purple-400">
							AI Chat
						</span>
						<h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
							Ask anything about your notes
						</h3>
						<p className="text-sm text-gray-500 sm:text-base">
							Chat with AI directly in the context of your note. Get
							explanations, summaries and deeper insights instantly.
						</p>
						<Screenshot
							src="/screenshots/chat.png"
							alt="AI Chat"
							zoom="right top"
							className="mt-2 aspect-[4/3] w-full"
						/>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section
				className="px-4 py-16 text-center sm:px-6 sm:py-24"
				style={{
					background: "linear-gradient(160deg, #fff8f5 0%, #f0f4ff 100%)",
				}}
			>
				<div className="mx-auto flex max-w-2xl flex-col items-center gap-5 sm:gap-6">
					<img
						src="/favicon.svg"
						alt="NoteDeck"
						className="h-12 w-12 sm:h-16 sm:w-16"
					/>
					<h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl lg:text-4xl">
						Start learning smarter today
					</h2>
					<p className="text-base text-gray-500 sm:text-lg">
						Join NoteDeck and bring your notes, flashcards and study schedule
						together.
					</p>
					<Link
						to="/register"
						className="mt-2 inline-flex h-14 items-center justify-center rounded-full border-[2.5px] border-black/10 bg-[#f4845f] px-10 text-base font-bold text-white shadow-[0_3px_0_#d4623d] transition-transform active:translate-y-[3px] active:[box-shadow:none]"
					>
						Create free account
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 px-6 border-t border-gray-100 text-center text-sm text-gray-400">
				<div className="flex items-center justify-center gap-2">
					<img src="/favicon.svg" alt="NoteDeck" className="w-5 h-5" />
					<span>NoteDeck © 2026</span>
				</div>
			</footer>
		</div>
	);
}
