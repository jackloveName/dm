import { getRecordStreak } from '@/common/insights.js'

export const badgeDefinitions = [
	{
		name: '认真记账',
		description: '已记账 30 次',
		metric: 'recordTotal',
		target: 30,
		imagePath: '/static/images/my/badge/img_bookkeep.png',
		tone: 'tone-gold'
	},
	{
		name: '餐桌记录者',
		description: '账单有 20 次餐饮支出',
		metric: 'diningExpense',
		target: 20,
		imagePath: '/static/images/my/badge/img_food.png',
		tone: 'tone-coral'
	},
	{
		name: '购物有计划',
		description: '账单有 100 次购物支出',
		metric: 'shoppingExpense',
		target: 100,
		imagePath: '/static/images/my/badge/img_shopping.png',
		tone: 'tone-murex'
	},
	{
		name: '通勤达人',
		description: '账单有 30 次交通支出',
		metric: 'transportExpense',
		target: 30,
		imagePath: '/static/images/my/badge/img_trans.png',
		tone: 'tone-ocean'
	},
	{
		name: '旅行收藏家',
		description: '账单有 10 次旅行支出',
		metric: 'travelExpense',
		target: 10,
		imagePath: '/static/images/my/badge/img_travel.png',
		tone: 'tone-sky'
	},
	{
		name: '人生赢家',
		description: '账单有 100 次奖金收入',
		metric: 'bonusIncome',
		target: 100,
		imagePath: '/static/images/my/badge/img_bonus.png',
		tone: 'tone-gold'
	},
	{
		name: '爱心大使',
		description: '账单总共有 100 次公益支出',
		metric: 'charityExpense',
		target: 100,
		imagePath: '/static/images/my/badge/img_charity.png',
		tone: 'tone-lime'
	},
	{
		name: '理财专家',
		description: '账单总共有 100000 次理财收入',
		metric: 'financeIncome',
		target: 100000,
		imagePath: '/static/images/my/badge/img_finance.png',
		tone: 'tone-mint'
	},
	{
		name: '学习狂热者',
		description: '账单总共有 1000 次教育支出',
		metric: 'educationExpense',
		target: 1000,
		imagePath: '/static/images/my/badge/img_fun.png',
		tone: 'tone-rose'
	},
	{
		name: '资深影迷',
		description: '账单总共有 1000 次电影支出',
		metric: 'movieExpense',
		target: 1000,
		imagePath: '/static/images/my/badge/img_movie.png',
		tone: 'tone-violet'
	},
	{
		name: '妙笔生花',
		description: '账单总共有 1000 次稿费收入',
		metric: 'royaltyIncome',
		target: 1000,
		imagePath: '/static/images/my/badge/img_royalty.png',
		tone: 'tone-plum'
	},
	{
		name: '话费传家宝',
		description: '账单总共有 10000 次通信支出',
		metric: 'communicationExpense',
		target: 10000,
		imagePath: '/static/images/my/badge/img_phone.png',
		tone: 'tone-teal'
	},
	{
		name: '稳定如常',
		description: '连续记账 180 天',
		metric: 'recordStreak',
		target: 180,
		imagePath: '/static/images/my/badge/img_utility.png',
		tone: 'tone-mint'
	}
]

function isType(item, type) {
	return item && item.type === type
}

function isCategory(item, category) {
	return item && item.category === category
}

function countBy(transactions, type, category) {
	return (Array.isArray(transactions) ? transactions : []).filter((item) => (
		isType(item, type) && isCategory(item, category)
	)).length
}

export function buildBadgeMetrics(transactions = []) {
	const records = Array.isArray(transactions) ? transactions : []

	return {
		recordTotal: records.length,
		diningExpense: countBy(records, 'out', '餐饮'),
		shoppingExpense: countBy(records, 'out', '购物'),
		transportExpense: countBy(records, 'out', '交通'),
		travelExpense: countBy(records, 'out', '旅行'),
		bonusIncome: countBy(records, 'in', '奖金'),
		charityExpense: countBy(records, 'out', '公益'),
		financeIncome: countBy(records, 'in', '理财'),
		educationExpense: countBy(records, 'out', '教育'),
		movieExpense: countBy(records, 'out', '电影'),
		royaltyIncome: countBy(records, 'in', '稿费'),
		communicationExpense: countBy(records, 'out', '通信'),
		recordStreak: getRecordStreak(records)
	}
}

export function buildBadges(metrics = {}) {
	return badgeDefinitions.map((definition) => {
		const current = Number(metrics[definition.metric] || 0)
		return {
			...definition,
			current,
			unlocked: current >= definition.target,
			earnedAt: '已达成',
			progress: `已完成 ${current} / ${definition.target}`
		}
	})
}
