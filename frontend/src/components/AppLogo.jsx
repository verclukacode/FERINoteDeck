import Icon from "./Icon.jsx";

export default function AppLogo({ size = 52 }) {
	return (
		<div
			className="flex items-center justify-center rounded-2xl"
			style={{
				width: size,
				height: size,
				background: "linear-gradient(135deg, #ffb07a 0%, #f07a4a 100%)",
				color: "white",
			}}
		>
			<Icon name="study-hat" size={size * 0.54} />
		</div>
	);
}
