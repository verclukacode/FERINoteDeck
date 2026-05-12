export default function NoteCard({ id, title, content, onDelete }) {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
					{title}
				</h3>
				{onDelete && (
					<button
						type="button"
						onClick={() => onDelete(id)}
						className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
					>
						Delete
					</button>
				)}
			</div>
			{content && (
				<p className="text-sm text-gray-600 dark:text-gray-400">{content}</p>
			)}
		</div>
	);
}
