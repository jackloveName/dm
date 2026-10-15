export const SUBSCRIPTION_STORAGE_KEY = 'subscriptions'
export const SUBSCRIPTION_CONFIG_SUFFIX = 'subscribeManagement'
const DAY_MS = 24 * 60 * 60 * 1000

export const SUBSCRIPTION_GROUPS = [
	{ name: '影音娱乐', tone: 'tone-violet', iconPath: '/static/images/category/icon_movie.png' },
	{ name: '效率工具', tone: 'tone-blue', iconPath: '/static/images/category/icon_utility.png' },
	{ name: '健康生活', tone: 'tone-mint', iconPath: '/static/images/category/icon_medical.png' },
	{ name: '其他订阅', tone: 'tone-slate', iconPath: '/static/images/category/icon_other.png' }
]

export const SUBSCRIPTION_FREQUENCIES = [
	{ value: 1, label: '每月', suffix: '月' },
	{ value: 3, label: '每季', suffix: '季' },
	{ value: 12, label: '每年', suffix: '年' }
]

function parseValue(value) {
	if (Array.isArray(value)) return value
	if (value && typeof value === 'object') {
		if (value.paramValue !== undefined) return parseValue(value.paramValue)
		if (value.value !== undefined) return parseValue(value.value)
	}
	if (typeof value !== 'string') return []
	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed) ? parsed : []
	} catch (error) {
		return []
	}
}

function parseDate(value) {
	const date = value instanceof Date ? new Date(value) : new Date(value || '')
	return Number.isNaN(date.getTime()) ? null : date
}

function getCreatedAt(item) {
	const source = item && (item.createdAt || item.createTime || item.startDate)
	const sourceDate = parseDate(source)
	if (sourceDate) return sourceDate.toISOString()

	const match = String(item && item.id || '').match(/^sub_(\d{13})/)
	if (!match) return ''

	const idDate = new Date(Number(match[1]))
	return Number.isNaN(idDate.getTime()) ? '' : idDate.toISOString()
}

export function normalizeSubscriptions(value) {
	return parseValue(value).map((item, index) => {
		const group = SUBSCRIPTION_GROUPS.some((entry) => entry.name === item.group) ? item.group : '其他订阅'
		const frequency = SUBSCRIPTION_FREQUENCIES.some((entry) => entry.value === Number(item.frequency || item.freq))
			? Number(item.frequency || item.freq)
			: 1
		return {
			id: item.id || `sub_${Date.now()}_${index}`,
			name: String(item.name || '未命名订阅').trim(),
			group,
			amount: Number(item.amount || 0),
			day: item.day === 'last' ? 'last' : Math.min(Math.max(Number(item.day) || 1, 1), 31),
			frequency,
			createdAt: getCreatedAt(item),
			used: item.used !== false
		}
	}).filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0)
}

export function getSubscriptionMonthlyAmount(item) {
	return Number(item && item.amount || 0) / Math.max(Number(item && item.frequency || 1), 1)
}

export function getSubscriptionFrequencyLabel(value) {
	return (SUBSCRIPTION_FREQUENCIES.find((item) => item.value === Number(value)) || SUBSCRIPTION_FREQUENCIES[0]).label
}

export function getSubscriptionFrequencySuffix(value) {
	return (SUBSCRIPTION_FREQUENCIES.find((item) => item.value === Number(value)) || SUBSCRIPTION_FREQUENCIES[0]).suffix
}

export function getSubscriptionDayLabel(value) {
	return value === 'last' ? '每月最后一天' : `每月 ${value} 日`
}

function startOfDay(value) {
	const date = value instanceof Date ? new Date(value) : new Date(value || Date.now())
	date.setHours(0, 0, 0, 0)
	return date
}

function getMonthIndex(date) {
	return date.getFullYear() * 12 + date.getMonth()
}

function getDateFromMonthIndex(monthIndex, day) {
	const year = Math.floor(monthIndex / 12)
	const month = monthIndex % 12
	return getChargeDate(year, month, day)
}

function getCalendarDayDistance(startDate, endDate) {
	const start = startOfDay(startDate)
	const end = startOfDay(endDate)
	const startTime = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
	const endTime = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
	return Math.round((endTime - startTime) / DAY_MS)
}

function getChargeDate(year, month, day) {
	const lastDay = new Date(year, month + 1, 0).getDate()
	const chargeDay = day === 'last' ? lastDay : Math.min(Math.max(Number(day) || 1, 1), lastDay)
	return new Date(year, month, chargeDay)
}

export function getNextSubscriptionChargeDate(item, referenceDate = new Date()) {
	const today = startOfDay(referenceDate)
	const day = item && item.day === 'last' ? 'last' : Number(item && item.day || 1)
	const frequency = Math.max(Number(item && item.frequency || 1), 1)
	const anchor = startOfDay(parseDate(item && item.createdAt) || today)
	const anchorMonthIndex = getMonthIndex(anchor)
	const todayMonthIndex = getMonthIndex(today)
	const elapsedMonths = Math.max(todayMonthIndex - anchorMonthIndex, 0)
	let chargeMonthIndex = anchorMonthIndex + Math.floor(elapsedMonths / frequency) * frequency
	let chargeDate = getDateFromMonthIndex(chargeMonthIndex, day)

	if (chargeDate < today) {
		chargeMonthIndex += frequency
		chargeDate = getDateFromMonthIndex(chargeMonthIndex, day)
	}

	return chargeDate
}

export function isSubscriptionChargeUpcoming(item, referenceDate = new Date(), days = 14) {
	const distance = getCalendarDayDistance(referenceDate, getNextSubscriptionChargeDate(item, referenceDate))
	return distance >= 0 && distance <= days
}

export function getSubscriptionChargeAmount(item) {
	const amount = Number(item && item.amount || 0)
	return Number.isFinite(amount) ? amount : 0
}
