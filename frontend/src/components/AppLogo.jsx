import logo from "../assets/Logo.svg";

export default function AppLogo({ size = 66 }) {
	return <img src={logo} width={size} height={size} alt="NoteDeck logo" />;
}
