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

export const seedPages = [
	{
		id: "page-tektonske",
		folderId: "folder-geo",
		title: "Tektonske plošče in relief",
		content: "# Tektonske plošče in relief\n",
		order: 0,
	},
	{
		id: "page-pasovi",
		folderId: "folder-geo",
		title: "Toplotni pasovi",
		content: "# Toplotni pasovi\n",
		order: 1,
	},
	{
		id: "page-prebivalstvo",
		folderId: "folder-geo",
		title: "Prebivalstvo in demografija v Evropi",
		content: "# Prebivalstvo in demografija v Evropi\n",
		order: 2,
	},
	{
		id: "page-urbanizacija",
		folderId: "folder-geo",
		title: "Urbanizacija",
		content: "# Urbanizacija\n",
		order: 3,
	},
	{
		id: "page-stevila",
		folderId: "folder-mat",
		title: "Naravna števila",
		content: "# Naravna števila\n",
		order: 0,
	},
	{
		id: "page-ulomki",
		folderId: "folder-mat",
		title: "Ulomki",
		content: "# Ulomki\n",
		order: 1,
	},
];
