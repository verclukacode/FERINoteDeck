export const seedFolders = [
	{
		id: "folder-mat",
		name: "Matematika",
		color: "purple",
		order: 0,
		collapsed: true,
	},
	{
		id: "folder-slo",
		name: "Slovenščina",
		color: "green",
		order: 1,
		collapsed: true,
	},
	{
		id: "folder-geo",
		name: "Geografija",
		color: "pink",
		order: 2,
		collapsed: false,
	},
	{
		id: "folder-ang",
		name: "Angleščina",
		color: "orange",
		order: 3,
		collapsed: true,
	},
];

// Wrap a markdown body in the NoteDeck editor sentinel.
const md = (body) => `<<<NoteDeckMD>>>\n${body}\n<<<NoteDeckMD>>>`;

export const seedPages = [
	{
		id: "page-tektonske",
		folderId: "folder-geo",
		title: "Tektonske plošče in relief",
		content: md(
			[
				"# Tektonske plošče in relief",
				"## Zgradba Zemlje",
				"Zemeljska skorja je razdeljena na več velikih plošč, ki se počasi premikajo.",
				"- celinske plošče",
				"- oceanske plošče",
			].join("\n"),
		),
		order: 0,
	},
	{
		id: "page-pasovi",
		folderId: "folder-geo",
		title: "Toplotni pasovi",
		content: md(
			[
				"# Tropski pas",
				"## Kje se nahaja",
				"Tropski pas leži med severnim in južnim povratnikom. Sončni žarki padajo skoraj navpično, zato je tam zelo toplo.",
				"Sonce je rumeni",
				"- visoke temperature skozi vso leto",
				"- veliko sonca in padavin",
				"- pogosti tropski gozdovi in savane",
				"Nekaj **značilnosti** tropskega pasu:",
				"1. vroče podnebje",
				"2. pogoste nevihte",
				"3. bujno rastlinstvo",
				"Tukaj je povezava do video gradiva: www.vseznam.si - ponovi!!!.",
				"---",
				"# Toplotni pasovi po svetu",
				"slika prikazuje vse toplotne pasove:",
				"Todo list (12.5.2026):",
				"- [x] Napravi zapiske za toplotne pasove",
				"- [ ] Nauči se toplotne pasove",
				'- [ ] Ponovi snov "Tektonske plošče in relief"',
			].join("\n"),
		),
		order: 1,
	},
	{
		id: "page-prebivalstvo",
		folderId: "folder-geo",
		title: "Prebivalstvo in demografija v Evropi",
		content: md(
			[
				"# Prebivalstvo in demografija v Evropi",
				"Evropa ima okoli 740 milijonov prebivalcev.",
			].join("\n"),
		),
		order: 2,
	},
	{
		id: "page-urbanizacija",
		folderId: "folder-geo",
		title: "Urbanizacija",
		content: md(
			"# Urbanizacija\nUrbanizacija je proces rasti mest in širjenja mestnega načina življenja.",
		),
		order: 3,
	},
	{
		id: "page-stevila",
		folderId: "folder-mat",
		title: "Naravna števila",
		content: md("# Naravna števila\nNaravna števila so 1, 2, 3, 4, ..."),
		order: 0,
	},
	{
		id: "page-ulomki",
		folderId: "folder-mat",
		title: "Ulomki",
		content: md("# Ulomki\nUlomek predstavlja del celote."),
		order: 1,
	},
];
