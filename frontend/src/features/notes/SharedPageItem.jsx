import { useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { useNotes } from "./NotesContext.jsx";

export default function SharedPageItem({ page }) {
	const { selectedPageId, selectPage, leaveSharedPage } = useNotes();
	const selected = selectedPageId === page.id;
	const ownerName =
		page._owner?.username ?? page._owner?.email?.split("@")[0] ?? "Unknown";
	const { menu, open, close } = useContextMenu();
	const [confirming, setConfirming] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => selectPage(page.id)}
				onContextMenu={open}
				className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
					selected
						? "font-semibold text-title underline"
						: "font-medium text-body hover:bg-bg"
				}`}
			>
				<Icon name="document" size={20} />
				<span className="min-w-0 flex-1 truncate">{page.title}</span>
				<img
					src={page._owner?.avatarUrl ?? userProfilePic}
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
							icon: "xmark",
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
					message={`You will lose access to "${page.title}".`}
					confirmLabel="Unsubscribe"
					onConfirm={() => {
						leaveSharedPage(page._inviteId, page.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</>
	);
}
