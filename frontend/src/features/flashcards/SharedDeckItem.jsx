import { useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { useFlashcards } from "./FlashcardsContext.jsx";

export default function SharedDeckItem({ deck }) {
	const { selectedDeckId, selectDeck, removeDeck } = useFlashcards();
	const selected = selectedDeckId === deck.id;
	const ownerName =
		deck._owner?.username ?? deck._owner?.email?.split("@")[0] ?? "Unknown";
	const { menu, open, close } = useContextMenu();
	const [confirming, setConfirming] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => selectDeck(deck.id)}
				onContextMenu={open}
				className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
					selected
						? "font-semibold text-title underline"
						: "font-medium text-body hover:bg-bg"
				}`}
			>
				<Icon name="flashcards" size={20} />
				<span className="min-w-0 flex-1 truncate">{deck.name}</span>
				<img
					src={deck._owner?.avatarUrl ?? userProfilePic}
					alt={ownerName}
					title={`Shared by ${ownerName}`}
					className="h-5 w-5 shrink-0 rounded-full border border-border-soft object-cover"
				/>
			</button>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Unsubscribe",
							icon: "trash",
							danger: true,
							onClick: () => {
								setConfirming(true);
								close();
							},
						},
					]}
				/>
			)}

			{confirming && (
				<ConfirmDialog
					title="Unsubscribe?"
					message={`Your copy of "${deck.name}" will be deleted.`}
					confirmLabel="Unsubscribe"
					onConfirm={() => {
						removeDeck(deck.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</>
	);
}
