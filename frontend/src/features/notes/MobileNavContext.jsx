import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

// Tracks whether the sidebar drawer is open on small screens. On desktop
// (≥640px) the sidebar is always inline so this is effectively unused there.
const MobileNavContext = createContext({
	sidebarOpen: false,
	openSidebar: () => {},
	closeSidebar: () => {},
});

export function MobileNavProvider({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const openSidebar = useCallback(() => setSidebarOpen(true), []);
	const closeSidebar = useCallback(() => setSidebarOpen(false), []);
	const value = useMemo(
		() => ({ sidebarOpen, openSidebar, closeSidebar }),
		[sidebarOpen, openSidebar, closeSidebar],
	);
	return (
		<MobileNavContext.Provider value={value}>
			{children}
		</MobileNavContext.Provider>
	);
}

export function useMobileNav() {
	return useContext(MobileNavContext);
}
