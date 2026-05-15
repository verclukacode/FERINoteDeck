// Duolingo-style button: flat color, 2.5px border and a solid offset shadow
// that the button "sinks" into when pressed. Pass bg/text/shadow via className,
// e.g. "bg-body text-white shadow-[0_2.5px_0_#5b5b5b]".
export default function DuoButton({ children, className = "", ...props }) {
	return (
		<button
			className={`rounded-[22.5px] border-[2.5px] border-black/15 px-5 font-semibold transition-transform active:translate-y-[2.5px] active:[box-shadow:none] ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}
