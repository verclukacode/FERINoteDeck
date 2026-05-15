import { Link } from "react-router-dom";

export default function LoginPage() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3">
			<h1 className="text-2xl font-bold text-title">Log in</h1>
			<p className="text-body">Login form coming soon.</p>
			<Link to="/" className="font-semibold text-folder-blue">
				Back to NoteDeck
			</Link>
		</div>
	);
}
