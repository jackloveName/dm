export const AA_SPLIT_STORAGE_KEY = 'aaSplitRecords'
export const AA_SPLIT_CONFIG_SUFFIX = 'aaSplit'

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

export function normalizeAaRecords(value) {
	return parseValue(value).map((item, index) => {
		const peopleCount = Math.max(Number(item.peopleCount || item.people || 0), 1)
		const paidCount = Math.min(Math.max(Number(item.paidCount || item.paid || 0), 0), peopleCount)
		return {
			id: item.id || `aa_${Date.now()}_${index}`,
			name: String(item.name || item.title || 'AA 分账').trim(),
			totalAmount: Number(item.totalAmount || item.amount || 0),
			peopleCount,
			paidCount,
			createdAt: item.createdAt || ''
		}
	}).filter((item) => item.name && Number.isFinite(item.totalAmount) && item.totalAmount > 0)
}

export function getAaOngoingRecords(records) {
	return (Array.isArray(records) ? records : []).filter((item) => Number(item.paidCount) < Number(item.peopleCount))
}

export function getAaSettledRecords(records) {
	return (Array.isArray(records) ? records : []).filter((item) => Number(item.paidCount) >= Number(item.peopleCount))
}
