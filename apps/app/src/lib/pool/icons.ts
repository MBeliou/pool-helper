// Line icon set from the design prototype (24x24, stroke=currentColor)
export const ICON_PATHS = {
	home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-6h4v6h5v-9',
	drop: 'M12 3.5c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10Z',
	wave: 'M3 13c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3M3 17c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3',
	shield: 'M12 3.5 5 6v5.5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-2.5ZM9.2 11.8l2 2 3.6-3.8',
	grid: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
	plus: 'M12 5v14M5 12h14',
	alert:
		'M12 8v5M12 16.5v.5M10.3 4.3 3 17a1.5 1.5 0 0 0 1.3 2.3h15.4A1.5 1.5 0 0 0 21 17L13.7 4.3a2 2 0 0 0-3.4 0Z',
	arrowUp: 'M12 19V6M6 11l6-6 6 6',
	arrowDn: 'M12 5v13M6 13l6 6 6-6',
	chevron: 'M9 5l7 7-7 7',
	thermo: 'M14 13.5V6a2 2 0 0 0-4 0v7.5a4 4 0 1 0 4 0Z',
	beaker: 'M9 4h6M10 4v6L5.5 18A2 2 0 0 0 7.3 21h9.4a2 2 0 0 0 1.8-3L14 10V4',
	spark:
		'M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
	close: 'M6 6l12 12M18 6 6 18',
	trend: 'M3 17l5-5 4 4 8-8M21 8v5h-5'
} as const;

export type IconName = keyof typeof ICON_PATHS;
