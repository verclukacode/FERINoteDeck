import userProfilePic from "../../assets/userProfilePic.svg";
import Modal from "../../components/Modal.jsx";
import { useFlashcards } from "../flashcards/FlashcardsContext.jsx";
import { useNotes } from "./NotesContext.jsx";

function InviteCard({ invite, kind, onAccept, onDecline }) {
	const sender = invite.sender;
	const senderName =
		sender?.username ?? sender?.email?.split("@")[0] ?? "Someone";
	const subject = kind === "deck" ? invite.deck?.name : invite.page?.title;
	const subjectLabel = kind === "deck" ? "deck" : "note";
	return (
		<div className="flex flex-col gap-3 rounded-2xl border-[2.5px] border-border-soft px-4 py-3">
			<div className="flex items-center gap-3">
				<img
					src={sender?.avatarUrl ?? userProfilePic}
					alt={senderName}
					className="h-9 w-9 shrink-0 rounded-full border-[2px] border-border-soft object-cover"
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-title">
						{senderName}
					</p>
					<p className="text-xs text-body">
						wants to share a {subjectLabel} with you
					</p>
				</div>
			</div>
			<p className="rounded-xl bg-bg-secondary px-3 py-2 text-sm font-medium text-title">
				"{subject}"
			</p>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => onAccept(invite.id)}
					className="flex-1 rounded-xl bg-folder-blue py-2 text-sm font-semibold text-white"
				>
					Accept
				</button>
				<button
					type="button"
					onClick={() => onDecline(invite.id)}
					className="flex-1 rounded-xl border-[2px] border-border-soft py-2 text-sm font-semibold text-body"
				>
					Decline
				</button>
			</div>
		</div>
	);
}

export default function NotificationsModal({ onClose }) {
	const { pendingInvites, acceptInvite, declineInvite } = useNotes();
	const { pendingDeckInvites, acceptDeckInvite, declineDeckInvite } =
		useFlashcards();

	const total = pendingInvites.length + pendingDeckInvites.length;

	return (
		<Modal open onClose={onClose}>
			<h2 className="px-1 text-2xl font-bold text-title">Notifications</h2>
			<p className="mt-1 px-1 text-sm text-body">
				Notes and decks shared directly with you.
			</p>

			{total === 0 ? (
				<p className="mt-6 text-center text-sm text-body">
					No pending invites.
				</p>
			) : (
				<div className="mt-4 flex flex-col gap-3">
					{pendingInvites.map((invite) => (
						<InviteCard
							key={`note-${invite.id}`}
							invite={invite}
							kind="note"
							onAccept={acceptInvite}
							onDecline={declineInvite}
						/>
					))}
					{pendingDeckInvites.map((invite) => (
						<InviteCard
							key={`deck-${invite.id}`}
							invite={invite}
							kind="deck"
							onAccept={acceptDeckInvite}
							onDecline={declineDeckInvite}
						/>
					))}
				</div>
			)}

			<button
				type="button"
				onClick={onClose}
				className="mt-5 w-full py-1 font-medium text-title"
			>
				Close
			</button>
		</Modal>
	);
}
