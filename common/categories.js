export const billCategories = [
	{ value: '0', type: '1', name: '餐饮', iconPath: '/static/images/category/icon_food.png', tone: 'tone-coral' },
	{ value: '1', type: '1', name: '交通', iconPath: '/static/images/category/icon_trans.png', tone: 'tone-ocean' },
	{ value: '2', type: '1', name: '购物', iconPath: '/static/images/category/icon_shopping.png', tone: 'tone-murex' },
	{ value: '3', type: '0', name: '人情', iconPath: '/static/images/category/icon_person.png', tone: 'tone-foam' },
	{ value: '4', type: '1', name: '娱乐', iconPath: '/static/images/category/icon_fun.png', tone: 'tone-sand' },
	{ value: '5', type: '1', name: '医疗', iconPath: '/static/images/category/icon_medical.png', tone: 'tone-pink' },
	{ value: '6', type: '1', name: '教育', iconPath: '/static/images/category/icon_study.png', tone: 'tone-rose' },
	{ value: '7', type: '1', name: '电影', iconPath: '/static/images/category/icon_movie.png', tone: 'tone-violet' },
	{ value: '8', type: '1', name: '旅行', iconPath: '/static/images/category/icon_travel.png', tone: 'tone-sky' },
	{ value: '9', type: '1', name: '通信', iconPath: '/static/images/category/icon_phone.png', tone: 'tone-teal' },
	{ value: '10', type: '0', name: '房租', iconPath: '/static/images/category/icon_rent.png', tone: 'tone-olive' },
	{ value: '11', type: '1', name: '水电', iconPath: '/static/images/category/icon_utility.png', tone: 'tone-cyan' },
	{ value: '12', type: '1', name: '煤气', iconPath: '/static/images/category/icon_gas.png', tone: 'tone-amber' },
	{ value: '13', type: '1', name: '公益', iconPath: '/static/images/category/icon_charity.png', tone: 'tone-lime' },
	{ value: '14', type: '2', name: '工资', iconPath: '/static/images/category/icon_salary.png', tone: 'tone-blue' },
	{ value: '15', type: '2', name: '奖金', iconPath: '/static/images/category/icon_bonus.png', tone: 'tone-gold' },
	{ value: '16', type: '2', name: '兼职', iconPath: '/static/images/category/icon_part_time.png', tone: 'tone-indigo' },
	{ value: '17', type: '2', name: '稿费', iconPath: '/static/images/category/icon_royalty.png', tone: 'tone-plum' },
	{ value: '18', type: '2', name: '理财', iconPath: '/static/images/category/icon_finance.png', tone: 'tone-mint' },
	{ value: '19', type: '2', name: '退款', iconPath: '/static/images/category/icon_refund.png', tone: 'tone-peach' },
	{ value: '20', type: '2', name: '补助', iconPath: '/static/images/category/icon_subsidy.png', tone: 'tone-lavender' },
	{ value: '99', type: '0', name: '其他', iconPath: '/static/images/category/icon_other.png', tone: 'tone-slate' }
]

export function getDefaultBillCategory() {
	return { ...billCategories[0] }
}

export function normalizeCategoryKey(value) {
	if (value === null || value === undefined) return ''
	return String(value).trim()
}

export function getBillCategoryByName(name) {
	const normalizedName = normalizeCategoryKey(name)
	return billCategories.find((item) => item.name === normalizedName)
}

export function getBillCategoryByValue(value) {
	const normalizedValue = normalizeCategoryKey(value)
	return billCategories.find((item) => item.value === normalizedValue)
}
