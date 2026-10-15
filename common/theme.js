export const SHELL_THEMES = [
	{ key: 'shell-pink', name: '初贝粉', className: 'theme-shell-pink' },
	{ key: 'shell-moon', name: '月光贝', className: 'theme-shell-moon' },
	{ key: 'shell-foam', name: '海沫贝', className: 'theme-shell-foam' },
	{ key: 'shell-coral', name: '珊瑚贝', className: 'theme-shell-coral' },
	{ key: 'shell-pearl', name: '珠光贝', className: 'theme-shell-pearl' },
	{ key: 'shell-sand', name: '沙金贝', className: 'theme-shell-sand' }
]

export const DEFAULT_SHELL_THEME = SHELL_THEMES[0]

export function getShellTheme(key) {
	return SHELL_THEMES.find((theme) => theme.key === key) || DEFAULT_SHELL_THEME
}

export function getSavedShellTheme() {
	return getShellTheme(uni.getStorageSync('app_theme'))
}

export function getNextShellTheme(key) {
	const currentIndex = Math.max(SHELL_THEMES.findIndex((theme) => theme.key === key), 0)
	return SHELL_THEMES[(currentIndex + 1) % SHELL_THEMES.length]
}
