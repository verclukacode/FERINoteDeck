import { useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
			<div className="flex items-center gap-2.5">
				<img src="/favicon.svg" alt="NoteDeck" className="w-9 h-9" />
				<span className="text-xl font-bold text-gray-900">NoteDeck</span>
			</div>
			<div className="flex items-center gap-3">
				<Link
					to="/login"
					className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
				>
					Log in
				</Link>
				<Link
					to="/register"
					className="px-5 py-2 text-sm font-semibold text-white bg-[#f4845f] rounded-full shadow-[0_2.5px_0_#d4623d] hover:opacity-90 transition-opacity"
				>
					Get started
				</Link>
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
			<img
				src={src}
				alt={alt}
				className="w-full h-full object-cover"
				style={{
					objectPosition: zoom,
					...(scale
						? { transform: `scale(${scale})`, transformOrigin: origin }
						: {}),
				}}
				onError={(e) => {
					e.target.style.display = "none";
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
		<section className="py-20 px-6 max-w-6xl mx-auto">
			<div
				className={`flex flex-col gap-12 items-center lg:gap-16 ${
					reverse ? "lg:flex-row-reverse" : "lg:flex-row"
				}`}
			>
				{/* Text */}
				<div className="flex-1 flex flex-col gap-5">
					<h2 className="text-4xl font-bold text-gray-900 leading-tight">
						<span style={{ color }}>{coloredWord}</span> {titleRest}
					</h2>
					<p className="text-lg text-gray-500 leading-relaxed">{description}</p>
					<div className="flex flex-col gap-2 mt-1">
						{items.map((item, i) => (
							<button
								key={item.title}
								type="button"
								onClick={() => setActive(i)}
								className={`flex items-start gap-4 px-4 py-4 rounded-2xl text-left transition-all ${
									active === i ? "bg-gray-50 shadow-sm" : "hover:bg-gray-50/60"
								}`}
								style={
									active === i
										? { border: "2.5px solid #e5e7eb" }
										: { border: "2.5px solid transparent" }
								}
							>
								<div
									className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-lg"
									style={{ background: `${color}15`, color }}
								>
									{item.icon}
								</div>
								<div>
									<p className="font-semibold text-gray-900">{item.title}</p>
									<p className="text-sm text-gray-500 mt-0.5">
										{item.description}
									</p>
								</div>
							</button>
						))}
					</div>
					<Link
						to="/register"
						className="inline-flex items-center gap-1 font-semibold text-sm mt-1"
						style={{ color }}
					>
						Try it now →
					</Link>
				</div>

				{/* Screenshot — swaps based on active item */}
				<div className="flex-1 w-full">
					<Screenshot
						src={current.screenshot}
						alt={current.title}
						zoom={current.zoom ?? "top center"}
						scale={current.scale}
						origin={current.origin}
						className="w-full aspect-[4/3]"
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
				className="pt-32 pb-20 px-6 text-center"
				style={{
					background:
						"linear-gradient(160deg, #fff8f5 0%, #f0f4ff 50%, #fff 100%)",
				}}
			>
				<div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
					<span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-sm font-semibold text-orange-500">
						✦ Your all-in-one study companion
					</span>
					<h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight">
						Notes, flashcards <span style={{ color: "#f4845f" }}>and more</span>
						<br />
						in one place
					</h1>
					<p className="text-xl text-gray-500 max-w-xl leading-relaxed">
						Write rich notes, study with spaced repetition flashcards, generate
						content with AI, and collaborate with your classmates — all in
						NoteDeck.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 mt-2">
						<Link
							to="/register"
							className="px-8 py-3.5 text-base font-bold text-white rounded-full shadow-[0_3px_0_#d4623d] hover:opacity-90 transition-opacity"
							style={{ background: "#f4845f" }}
						>
							Get started for free
						</Link>
						<Link
							to="/login"
							className="px-8 py-3.5 text-base font-semibold text-gray-700 bg-white rounded-full border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
						>
							Log in
						</Link>
					</div>
				</div>

				{/* Hero screenshot */}
				<div className="mt-14 max-w-5xl mx-auto">
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
			<section className="py-20 px-6 max-w-6xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="flex flex-col gap-5 p-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
						<span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-green-50 text-green-500">
							Marketplace
						</span>
						<h3 className="text-2xl font-bold text-gray-900">
							Discover community content
						</h3>
						<p className="text-gray-500">
							Browse public notes and flashcard decks from other students.
							Preview and clone anything into your workspace in one click.
						</p>
						<Screenshot
							src="/screenshots/marketplace.png"
							alt="Marketplace"
							zoom="top center"
							scale={1.65}
							origin="38% 42%"
							className="w-full aspect-[4/3] mt-2"
						/>
					</div>
					<div className="flex flex-col gap-5 p-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
						<span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-50 text-purple-400">
							AI Chat
						</span>
						<h3 className="text-2xl font-bold text-gray-900">
							Ask anything about your notes
						</h3>
						<p className="text-gray-500">
							Chat with AI directly in the context of your note. Get
							explanations, summaries and deeper insights instantly.
						</p>
						<Screenshot
							src="/screenshots/chat.png"
							alt="AI Chat"
							zoom="right top"
							className="w-full aspect-[4/3] mt-2"
						/>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section
				className="py-24 px-6 text-center"
				style={{
					background: "linear-gradient(160deg, #fff8f5 0%, #f0f4ff 100%)",
				}}
			>
				<div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
					<img src="/favicon.svg" alt="NoteDeck" className="w-16 h-16" />
					<h2 className="text-4xl font-extrabold text-gray-900">
						Start learning smarter today
					</h2>
					<p className="text-lg text-gray-500">
						Join NoteDeck and bring your notes, flashcards and study schedule
						together.
					</p>
					<Link
						to="/register"
						className="mt-2 px-10 py-4 text-base font-bold text-white rounded-full shadow-[0_3px_0_#d4623d] hover:opacity-90 transition-opacity"
						style={{ background: "#f4845f" }}
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
