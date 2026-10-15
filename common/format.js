export function formatAmount(value, options = {}) {
	const amount = Number(value)
	if (!Number.isFinite(amount)) return options.minimumFractionDigits === 2 ? '0.00' : '0'

	const absoluteAmount = Math.abs(amount)
	const formatOptions = {
		minimumFractionDigits: options.minimumFractionDigits === undefined ? 0 : options.minimumFractionDigits,
		maximumFractionDigits: options.maximumFractionDigits === undefined ? 2 : options.maximumFractionDigits
	}

	if (absoluteAmount > 10000000) {
		const unit = absoluteAmount >= 100000000 ? '亿' : '万'
		const divisor = unit === '亿' ? 100000000 : 10000
		const compactValue = (absoluteAmount / divisor).toLocaleString('zh-CN', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		})
		return `${amount < 0 ? '-' : ''}${compactValue}${unit}`
	}

	return amount.toLocaleString('zh-CN', formatOptions)
}

export function formatAmountWithFixedDecimals(value, fractionDigits = 2) {
	const amount = Number(value)
	if (!Number.isFinite(amount)) return (0).toFixed(fractionDigits)

	const fixed = Math.abs(amount).toFixed(fractionDigits)
	const [integerPart, decimalPart] = fixed.split('.')
	const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	return `${amount < 0 ? '-' : ''}${groupedInteger}.${decimalPart}`
}
