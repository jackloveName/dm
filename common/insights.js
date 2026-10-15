import { getBillCategoryByName } from '@/common/categories.js'

function pad(value) {
	return String(value).padStart(2, '0')
}

export function getCurrentMonth() {
	const date = new Date()
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function normalizeDate(value) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		const timestamp = value < 1000000000000 ? value * 1000 : value
		const date = new Date(timestamp)
		if (!Number.isNaN(date.getTime())) {
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		}
	}

	const text = String(value || '').trim()
	if (/^\d{10,13}$/.test(text)) {
		const timestamp = Number(text) < 1000000000000 ? Number(text) * 1000 : Number(text)
		const date = new Date(timestamp)
		if (!Number.isNaN(date.getTime())) {
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		}
	}
	const dateMatch = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
	if (dateMatch) return `${dateMatch[1]}-${pad(dateMatch[2])}-${pad(dateMatch[3])}`

	const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/)
	if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`

	return ''
}

export function normalizeMonth(value) {
	const normalizedDate = normalizeDate(value)
	if (normalizedDate) return normalizedDate.slice(0, 7)

	const text = String(value || '').trim()
	const match = text.match(/(\d{4})\D*(\d{1,2})/)
	if (!match) return ''
	const [, year, month] = match
	return `${year}-${pad(month)}`
}

export function getBillMonth(item) {
	return normalizeMonth(item && (item.fullDate || item.date || item.time))
}

export function getBillsByMonth(bills, month) {
	const targetMonth = normalizeMonth(month)
	return (Array.isArray(bills) ? bills : []).filter((item) => getBillMonth(item) === targetMonth)
}

export function getBillsByPeriod(bills, period, referenceDate = new Date()) {
	const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const end = new Date(start)

	if (period === 'day') {
		end.setDate(start.getDate())
		start.setDate(start.getDate())
	} else if (period === 'week') {
		const day = start.getDay() || 7
		start.setDate(start.getDate() - day + 1)
		end.setDate(start.getDate() + 6)
	} else if (period === 'quarter') {
		const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3
		start.setMonth(quarterStartMonth, 1)
		end.setMonth(quarterStartMonth + 3, 0)
	} else if (period === 'year') {
		start.setMonth(0, 1)
		end.setMonth(12, 0)
	} else {
		start.setDate(1)
		end.setMonth(start.getMonth() + 1, 0)
	}

	const startText = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
	const endText = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
	return (Array.isArray(bills) ? bills : []).filter((item) => {
		const dateText = normalizeDate(item && (item.fullDate || item.date || item.time))
		if (!dateText) return false
		return dateText >= startText && dateText <= endText
	})
}

export function getTotalByType(bills, type) {
	return (Array.isArray(bills) ? bills : []).reduce((total, item) => {
		if (item.type !== type) return total
		return total + Number(item.money || 0)
	}, 0)
}

export function getCategoryStats(bills, month) {
	const totals = {}
	let expenseTotal = 0

	getBillsByMonth(bills, month).forEach((item) => {
		if (item.type !== 'out') return
		const category = item.category || '其他'
		const amount = Number(item.money || 0)
		totals[category] = (totals[category] || 0) + amount
		expenseTotal += amount
	})

	return Object.keys(totals)
		.map((name) => {
			const amount = totals[name]
			const percent = expenseTotal ? ((amount / expenseTotal) * 100).toFixed(2) : '0.00'
			return {
				name,
				amount,
				value: amount,
				percent,
				progress: `${Math.min(Number(percent), 100)}%`,
				...(getBillCategoryByName(name) || {})
			}
		})
		.sort((first, second) => second.amount - first.amount)
}

export function getCategoryStatsByPeriod(bills, period, referenceDate = new Date()) {
	const totals = {}
	let expenseTotal = 0

	getBillsByPeriod(bills, period, referenceDate).forEach((item) => {
		if (item.type !== 'out') return
		const category = item.category || '其他'
		const amount = Number(item.money || 0)
		totals[category] = (totals[category] || 0) + amount
		expenseTotal += amount
	})

	return Object.keys(totals)
		.map((name) => {
			const amount = totals[name]
			const percent = expenseTotal ? ((amount / expenseTotal) * 100).toFixed(2) : '0.00'
			return {
				name,
				amount,
				value: amount,
				percent,
				progress: `${Math.min(Number(percent), 100)}%`,
				...(getBillCategoryByName(name) || {})
			}
		})
		.sort((first, second) => second.amount - first.amount)
}

export function getMonthlyTrends(bills, monthCount = 6) {
	const now = new Date()
	const months = []
	for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
		const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
		months.push({
			key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
			label: `${date.getMonth() + 1}月`,
			value: 0,
			active: offset === 0
		})
	}

	const records = Array.isArray(bills) ? bills : []
	records.forEach((item) => {
		if (item.type !== 'out') return
		const trend = months.find((entry) => entry.key === getBillMonth(item))
		if (trend) trend.value += Number(item.money || 0)
	})

	const maxValue = Math.max(...months.map((item) => item.value), 1)
	months.forEach((item) => {
		item.height = `${Math.max(Math.round((item.value / maxValue) * 100), 4)}%`
	})
	return months
}

export function getPeriodTrends(bills, period = 'month', periodCount = 6, referenceDate = new Date()) {
		const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
		const periods = []

		for (let offset = periodCount - 1; offset >= 0; offset -= 1) {
			const periodDate = new Date(date)
			let label = ''

			if (period === 'day') {
				periodDate.setHours(0, 0, 0, 0)
				periodDate.setDate(periodDate.getDate() - offset)
				label = `${periodDate.getMonth() + 1}/${periodDate.getDate()}`
			} else if (period === 'week') {
				const day = periodDate.getDay() || 7
				periodDate.setDate(periodDate.getDate() - day + 1 - offset * 7)
				label = `${periodDate.getMonth() + 1}/${periodDate.getDate()}`
			} else if (period === 'year') {
				periodDate.setFullYear(periodDate.getFullYear() - offset, 0, 1)
				label = `${periodDate.getFullYear()}年`
			} else {
				periodDate.setDate(1)
				periodDate.setMonth(periodDate.getMonth() - offset)
				label = `${periodDate.getMonth() + 1}月`
			}

			const periodBills = getBillsByPeriod(bills, period, periodDate)
			periods.push({
				key: `${period}-${periodDate.getFullYear()}-${periodDate.getMonth() + 1}-${periodDate.getDate()}`,
				label,
				month: label,
				value: getTotalByType(periodBills, 'out'),
				active: offset === 0
			})
		}

		const maxValue = Math.max(...periods.map((item) => item.value), 1)
		periods.forEach((item) => {
			item.height = `${Math.max(Math.round((item.value / maxValue) * 100), 4)}%`
		})
		return periods
}

function getRecordDates(bills) {
	const dates = new Set()
	const records = Array.isArray(bills) ? bills : []
	records.forEach((item) => {
		const date = normalizeDate(item.submittedAt)
		if (date) dates.add(date)
	})
	return dates
}

export function getRecordStreak(bills) {
	const dates = getRecordDates(bills)
	if (!dates.size) return 0

	const dayTime = 24 * 60 * 60 * 1000
	const today = new Date()
	const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
	const todayText = formatDate(today)
	const yesterdayText = formatDate(new Date(today.getTime() - dayTime))

	if (!dates.has(todayText) && !dates.has(yesterdayText)) return 0

	let streak = 0
	let cursor = dates.has(todayText) ? today : new Date(today.getTime() - dayTime)
	while (dates.has(formatDate(cursor))) {
		streak += 1
		cursor = new Date(cursor.getTime() - dayTime)
	}
	return streak
}

export function getDistinctRecordDays(bills) {
	return getRecordDates(bills).size
}
