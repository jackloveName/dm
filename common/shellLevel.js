export const SHELL_XP_PER_RECORD = 10

export const SHELL_STREAK_BONUSES = [
	{ streak: 3, bonus: 2 },
	{ streak: 4, bonus: 4 },
	{ streak: 5, bonus: 6 },
	{ streak: 6, bonus: 8 },
	{ streak: 7, bonus: 10 },
	{ streak: 8, bonus: 15 }
]

export const SHELL_LEVELS = [
	{ level: 1, name: '小扇贝', requiredExperience: 0, imagePath: '/static/images/shellLevel/shell_lv1.png' },
	{ level: 2, name: '海螺', requiredExperience: 100, imagePath: '/static/images/shellLevel/shell_lv2.png' },
	{ level: 3, name: '花蛤', requiredExperience: 300, imagePath: '/static/images/shellLevel/shell_lv3.png' },
	{ level: 4, name: '鲍鱼', requiredExperience: 600, imagePath: '/static/images/shellLevel/shell_lv4.png' },
	{ level: 5, name: '砗磲', requiredExperience: 1000, imagePath: '/static/images/shellLevel/shell_lv5.png' },
	{ level: 6, name: '珍珠贝', requiredExperience: 1600, imagePath: '/static/images/shellLevel/shell_lv6.png' },
	{ level: 7, name: '月光贝', requiredExperience: 2400, imagePath: '/static/images/shellLevel/shell_lv7.png' },
	{ level: 8, name: '金贝', requiredExperience: 3500, imagePath: '/static/images/shellLevel/shell_lv8.png' }
]

export function getShellStreakBonus(streak) {
	const count = Math.max(Math.floor(Number(streak) || 0), 0)
	if (count < 3) return 0
	if (count > 7) return 15
	return SHELL_STREAK_BONUSES[count - 3].bonus
}

export function getShellExperience(recordCount, streak = 0) {
	const count = Math.max(Math.floor(Number(recordCount) || 0), 0)
	return count * SHELL_XP_PER_RECORD + getShellStreakBonus(streak)
}

export function getShellLevelInfo(experience) {
	const totalExperience = Math.max(Math.floor(Number(experience) || 0), 0)
	let levelIndex = 0

	SHELL_LEVELS.forEach((item, index) => {
		if (item.requiredExperience <= totalExperience) levelIndex = index
	})

	const currentLevel = SHELL_LEVELS[levelIndex]
	const nextLevel = SHELL_LEVELS[levelIndex + 1] || currentLevel
	const levelStartExperience = currentLevel.requiredExperience
	const levelTargetExperience = nextLevel.requiredExperience
	const levelRange = levelTargetExperience - levelStartExperience
	const levelProgressExperience = Math.min(
		Math.max(totalExperience - levelStartExperience, 0),
		Math.max(levelRange, 0)
	)

	return {
		...currentLevel,
		totalExperience,
		nextLevel: nextLevel.level,
		nextName: nextLevel.name,
		nextRequiredExperience: nextLevel.requiredExperience,
		levelStartExperience,
		levelProgressExperience,
		progressPercent: levelRange > 0 ? Math.round((levelProgressExperience / levelRange) * 100) : 100,
		maxLevel: currentLevel.level === SHELL_LEVELS[SHELL_LEVELS.length - 1].level
	}
}
