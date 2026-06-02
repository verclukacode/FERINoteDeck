// One SVG path filled with a slowly-rotating pink → purple → blue linear
// gradient. The gradient's `gradientTransform` animates via SMIL so the icon
// shape itself stays static while the colours flow through it. Used as the
// hero icon inside the magical loader.
export default function RainbowIcon({ viewBox, path, size = 88, gradientId }) {
	const [vbX, vbY, vbW, vbH] = viewBox.split(" ").map(Number);
	const cx = vbX + vbW / 2;
	const cy = vbY + vbH / 2;
	return (
		<svg width={size} height={size} viewBox={viewBox} aria-hidden="true">
			<defs>
				<linearGradient
					id={gradientId}
					gradientUnits="userSpaceOnUse"
					x1={vbX}
					y1={vbY}
					x2={vbX + vbW}
					y2={vbY + vbH}
				>
					<stop offset="0%" stopColor="#ff70c3" />
					<stop offset="50%" stopColor="#7092ff" />
					<stop offset="100%" stopColor="#499ef3" />
					<animateTransform
						attributeName="gradientTransform"
						type="rotate"
						from={`0 ${cx} ${cy}`}
						to={`360 ${cx} ${cy}`}
						dur="6s"
						repeatCount="indefinite"
					/>
				</linearGradient>
			</defs>
			<path d={path} fill={`url(#${gradientId})`} />
		</svg>
	);
}

// Hero path lifted from frontend/src/assets/icons/studt_hat.svg.
export const STUDY_HAT = {
	viewBox: "0 0 27 24",
	path: "M25.4688 5.03906C26.1426 5.3418 26.4941 5.89844 26.4941 6.47461C26.4941 7.05078 26.1426 7.59766 25.4688 7.91016L15.9277 12.2754C14.9023 12.7441 14.0625 12.959 13.2422 12.9395C12.4219 12.959 11.5918 12.7539 10.5664 12.2754L6.32812 10.3418L12.2852 7.56836C12.5879 7.65625 12.9297 7.70508 13.2812 7.70508C14.3945 7.70508 15.459 7.19727 15.459 6.47461C15.459 5.77148 14.3848 5.26367 13.2812 5.26367C12.168 5.26367 11.084 5.77148 11.084 6.47461C11.084 6.54297 11.1035 6.61133 11.1426 6.66992L4.82422 9.61914L1.02539 7.91016C0.351562 7.59766 0 7.05078 0 6.47461C0 5.89844 0.351562 5.3418 1.02539 5.03906L10.5664 0.673828C11.5918 0.214844 12.4219 0 13.2422 0.00976562C14.0625 0 14.9023 0.214844 15.9277 0.673828L25.4688 5.03906ZM6.29883 11.8848L9.9707 13.5742C11.1523 14.1113 12.2266 14.375 13.2422 14.3652C14.2676 14.375 15.3418 14.1113 16.5234 13.5742L22.8906 10.6445V13.75C22.8906 16.7871 18.9844 19.2578 13.2422 19.2578C10.3906 19.2578 7.98828 18.6426 6.29883 17.627V11.8848ZM3.59375 10.6543L4.86328 11.2402V16.4746C4.05273 15.6152 3.59375 14.5996 3.59375 13.75V10.6543ZM4.01367 19.9512C4.01367 19.3066 4.33594 18.8379 4.86328 18.6621V16.4746C5.25391 16.9043 5.73242 17.2949 6.29883 17.627V18.6621C6.81641 18.8477 7.13867 19.3164 7.13867 19.9512V22.4902C7.13867 23.3105 6.60156 23.8477 5.77148 23.8477H5.38086C4.56055 23.8477 4.01367 23.3105 4.01367 22.4902V19.9512Z",
};

// Hero path lifted from frontend/src/assets/icons/flashcards.svg.
export const FLASHCARDS = {
	viewBox: "0 0 23 26",
	path: "M9.42383 4.10156C6.45508 4.10156 4.64844 5.9082 4.64844 8.89648V21.5332C3.61328 21.2109 2.93945 20.3418 2.68555 18.9258L0.371094 5.81055C0 3.67188 0.917969 2.35352 3.02734 1.98242L12.2168 0.361328C14.3262 0 15.6543 0.917969 16.0254 3.05664L16.2012 4.10156H9.42383ZM22.0312 8.89648V22.2168C22.0312 24.375 20.8984 25.5273 18.7598 25.5273H9.42383C7.28516 25.5273 6.14258 24.375 6.14258 22.2168V8.89648C6.14258 6.73828 7.28516 5.5957 9.42383 5.5957H18.7598C20.8984 5.5957 22.0312 6.73828 22.0312 8.89648Z",
};
