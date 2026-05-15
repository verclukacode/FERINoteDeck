export default function Pill({ children, className = "" }) {
	return (
		<div className={`flex items-center gap-1 rounded-full bg-bg ${className}`}>
			{children}
		</div>
	);
}
