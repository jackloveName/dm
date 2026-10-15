const DAY_MS = 24 * 60 * 60 * 1000

export const PAYDAY_OPTIONS = [1, 5, 10, 15, 20, 25, 28, 'last']

export const FIXED_EXPENSE_OPTIONS = ['房租', '水电', '煤气', '通信', '其他']

export const DEFAULT_PAYDAY_BUDGET = {
	payday: 10,
	salary: 0,
	fixedExpenses: []
}

function pad(value) {
	return String(value).padStart(2, '0')
}

function startOfDay(value) {
	const date = value instanceof Date ? new Date(value) : new Date(value || Date.now())
	date.setHours(0, 0, 0, 0)
	return date
}

function getLastDayOfMonth(year, month) {
	return new Date(year, month + 1, 0).getDate()
}

function getPaydayDate(year, month, payday) {
	const lastDay = getLastDayOfMonth(year, month)
	const day = payday === 'last' ? lastDay : Math.min(Number(payday) || 1, lastDay)
	return new Date(year, month, day)
}

function formatDate(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatShortDate(date) {
	return `${date.getMonth() + 1}/${date.getDate()}`
}

function getDateText(item) {
	return String(item && (item.fullDate || item.date || item.time) || '')
}

function getDateOnlyText(value) {
	const text = typeof value === 'object' ? getDateText(value) : String(value || '')
	const match = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
	if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`

	const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/)
	return compactMatch ? `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}` : ''
}

function getCycleDates(referenceDate, payday) {
	const today = startOfDay(referenceDate)
	const currentPayday = getPaydayDate(today.getFullYear(), today.getMonth(), payday)
	const nextPayday = currentPayday > today
		? currentPayday
		: getPaydayDate(today.getFullYear(), today.getMonth() + 1, payday)
	const previousPayday = getPaydayDate(nextPayday.getFullYear(), nextPayday.getMonth() - 1, payday)

	return {
		today,
		start: previousPayday,
		end: nextPayday
	}
}

export function normalizePaydayBudget(value) {
	const source = value && typeof value === 'object' ? value : {}
	const payday = source.payday === 'last' || PAYDAY_OPTIONS.includes(Number(source.payday))
		? source.payday
		: DEFAULT_PAYDAY_BUDGET.payday
	const salary = Number(source.salary)
	const fixedExpenses = Array.isArray(source.fixedExpenses)
		? source.fixedExpenses.map((item, index) => ({
			id: item && item.id ? String(item.id) : `fixed-${Date.now()}-${index}`,
			name: String(item && item.name || '其他'),
			amount: Math.max(Number(item && (item.amount !== undefined ? item.amount : item.amt) || 0), 0)
		}))
		: []

	return {
		payday,
		salary: Number.isFinite(salary) && salary > 0 ? salary : 0,
		fixedExpenses
	}
}

export function getPaydayLabel(payday) {
	return payday === 'last' ? '每月最后一天' : `每月 ${Number(payday)} 日`
}

export function getPaydayPromptStorageKey(account, cycleStart) {
	return `paydaySalaryPrompt:${account || 'default-user'}:${cycleStart || 'unknown'}`
}

export function getPaydayPromptSnoozeStorageKey(account, cycleStart) {
	return `${getPaydayPromptStorageKey(account, cycleStart)}:snoozeUntil`
}

export function getPaydayCycle(referenceDate = new Date(), payday = DEFAULT_PAYDAY_BUDGET.payday) {
	const dates = getCycleDates(referenceDate, payday)
	const totalDays = Math.max(Math.round((dates.end - dates.start) / DAY_MS), 1)
	const elapsedDays = Math.max(Math.min(Math.round((dates.today - dates.start) / DAY_MS), totalDays), 0)
	const displayEnd = new Date(dates.end)
	displayEnd.setDate(displayEnd.getDate() - 1)

	return {
		...dates,
		totalDays,
		elapsedDays,
		remainingDays: Math.max(totalDays - elapsedDays, 0),
		startText: formatDate(dates.start),
		endText: formatDate(dates.end),
		label: `${formatShortDate(dates.start)} - ${formatShortDate(displayEnd)}`
	}
}

export function getPaydayBudgetSummary(bills, config, referenceDate = new Date()) {
	const normalized = normalizePaydayBudget(config)
	const cycle = getPaydayCycle(referenceDate, normalized.payday)
	const fixedTotal = normalized.fixedExpenses.reduce((total, item) => total + item.amount, 0)
	const freeBudget = Math.max(normalized.salary - fixedTotal, 0)
	const startText = cycle.startText
	const endText = cycle.endText
	const todayText = formatDate(cycle.today)
	const fixedRemaining = normalized.fixedExpenses.reduce((result, item) => {
		const name = String(item.name || '其他')
		result[name] = Number(result[name] || 0) + Math.max(Number(item.amount || 0), 0)
		return result
	}, {})
	let fixedCovered = 0
	const totalSpent = (Array.isArray(bills) ? bills : []).reduce((total, item) => {
		if (item.type !== 'out') return total
		const billDate = getDateOnlyText(item)
		if (!billDate || billDate < startText || billDate > todayText || billDate >= endText) return total

		const amount = Math.max(Number(item.money || 0), 0)
		const category = String(item.category || '')
		const reserved = Number(fixedRemaining[category] || 0)
		const covered = Math.min(amount, reserved)
		if (covered > 0) {
			fixedRemaining[category] = reserved - covered
			fixedCovered += covered
		}
		return total + amount - covered
	}, 0)
	const spent = Math.max(totalSpent, 0)
	const remainingRaw = freeBudget - spent
	const remainingBudget = Math.max(remainingRaw, 0)
	const dailyBudget = cycle.remainingDays > 0 ? remainingBudget / cycle.remainingDays : 0
	const spendingPercent = freeBudget > 0 ? Math.min(Math.round((spent / freeBudget) * 100), 100) : 0

	return {
		...cycle,
		payday: normalized.payday,
		salary: normalized.salary,
		fixedTotal,
		fixedCovered,
		freeBudget,
		spent,
		remainingRaw,
		remainingBudget,
		dailyBudget,
		spendingPercent,
		isOverBudget: remainingRaw < 0,
		configured: normalized.salary > 0
	}
}
