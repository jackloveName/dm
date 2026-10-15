import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadCommonModule(relativePath, names) {
	const filePath = path.join(root, relativePath)
	const source = fs.readFileSync(filePath, 'utf8')
		.replace(/^\s*import\s.+$/gm, '')
		.replace(/^\s*export\s+(?=(const|function|class|let|var)\b)/gm, '')
	const factory = new Function(`${source}\nreturn { ${names.join(', ')} }`)
	return factory()
}

function assert(condition, message) {
	if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
	}
}

function localDateText(value) {
	const date = value instanceof Date ? value : new Date(value)
	const pad = (item) => String(item).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const subscription = loadCommonModule('common/subscription.js', [
	'getSubscriptionMonthlyAmount',
	'getSubscriptionChargeAmount',
	'getNextSubscriptionChargeDate',
	'isSubscriptionChargeUpcoming'
])
const payday = loadCommonModule('common/paydayBudget.js', ['getPaydayBudgetSummary'])
const aaSplit = loadCommonModule('common/aaSplit.js', ['getAaOngoingRecords', 'getAaSettledRecords'])
const shell = loadCommonModule('common/shellLevel.js', ['getShellStreakBonus'])
const format = loadCommonModule('common/format.js', ['formatAmountWithFixedDecimals'])
const insights = loadCommonModule('common/insights.js', ['getDistinctRecordDays'])

const tests = [
	['订阅月末边界', () => {
		const item = { day: 'last', frequency: 1, createdAt: '2026-01-01' }
		assertEqual(localDateText(subscription.getNextSubscriptionChargeDate(item, new Date(2026, 2, 18))), '2026-03-31', '月末扣费日应指向当前月最后一天')
		assert(subscription.isSubscriptionChargeUpcoming(item, new Date(2026, 2, 18)), '距月末 13 天应标记为近 2 周扣费')
		assert(!subscription.isSubscriptionChargeUpcoming(item, new Date(2026, 3, 1)), '跨过月末后应重新计算下个月扣费日')
	}],
	['年付订阅使用实际扣费金额', () => {
		const item = { amount: 999, frequency: 12 }
		assertEqual(subscription.getSubscriptionMonthlyAmount(item), 83.25, '月均金额应按频率折算')
		assertEqual(subscription.getSubscriptionChargeAmount(item), 999, '近 2 周金额应使用实际扣费金额')
	}],
	['发薪日预算不重复扣除固定支出', () => {
		const bills = [
			{ type: 'out', category: '房租', money: 3000, date: '2026-09-11' },
			{ type: 'out', category: '餐饮', money: 1000, date: '2026-09-12' }
		]
		const summary = payday.getPaydayBudgetSummary(bills, {
			payday: 10,
			salary: 10000,
			fixedExpenses: [{ name: '房租', amount: 3000 }]
		}, new Date(2026, 8, 15))
		assertEqual(summary.freeBudget, 7000, '自由预算应先扣除固定支出')
		assertEqual(summary.spent, 1000, '固定支出账单不能再次计入本期自由支出')
	}],
	['AA 分账状态划分', () => {
		const records = [
			{ id: 'ongoing', peopleCount: 3, paidCount: 2 },
			{ id: 'settled', peopleCount: 3, paidCount: 3 }
		]
		assertEqual(aaSplit.getAaOngoingRecords(records).map((item) => item.id).join(','), 'ongoing', '进行中数据应按未全部付清判断')
		assertEqual(aaSplit.getAaSettledRecords(records).map((item) => item.id).join(','), 'settled', '已结算数据应按全部付清判断')
	}],
	['贝壳连续记录加成', () => {
		assertEqual(shell.getShellStreakBonus(2), 0, '连续不足 3 天不应加成')
		assertEqual(shell.getShellStreakBonus(3), 2, '连续 3 天应加 2')
		assertEqual(shell.getShellStreakBonus(7), 10, '连续 7 天应加 10')
		assertEqual(shell.getShellStreakBonus(8), 15, '连续超过 7 天应加 15')
	}],
	['安卓首页月均金额固定两位小数', () => {
		assertEqual(format.formatAmountWithFixedDecimals(83.25), '83.25', '金额应显示两位小数')
		assertEqual(format.formatAmountWithFixedDecimals(100), '100.00', '整数金额也应补齐两位小数')
	}],
	['我的页面按记账日期累计天数', () => {
		const bills = [
			{ date: '2026-09-17 09:30:00', submittedAt: '2026-09-18T01:30:00.000Z' },
			{ date: '2026-09-17 18:20:00', submittedAt: '2026-09-18T10:20:00.000Z' },
			{ date: '2026-09-19 08:10:00', submittedAt: '2026-09-20T00:10:00.000Z' },
			{ date: '2026-09-21 08:10:00' }
		]
		assertEqual(insights.getDistinctRecordDays(bills), 2, '只统计 submittedAt，同一天提交多笔只算 1 天，缺失提交时间不计入')
	}]
]

let passed = 0
for (const [name, run] of tests) {
	try {
		run()
		passed += 1
		console.log(`PASS ${name}`)
	} catch (error) {
		console.error(`FAIL ${name}`)
		console.error(`  ${error.message}`)
		process.exitCode = 1
	}
}

console.log(`${passed}/${tests.length} tests passed`)
