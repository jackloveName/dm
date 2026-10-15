import config from '@/config.js'
import { request } from '@/common/request.js'
import { getBillCategoryByName, getBillCategoryByValue, normalizeCategoryKey } from '@/common/categories.js'
import { formatAmount } from '@/common/format.js'
import { encrypt } from '@/common/crypto.js'
import { AA_SPLIT_CONFIG_SUFFIX, AA_SPLIT_STORAGE_KEY } from '@/common/aaSplit.js'
import { SUBSCRIPTION_CONFIG_SUFFIX, SUBSCRIPTION_STORAGE_KEY } from '@/common/subscription.js'
import { DEFAULT_PAYDAY_BUDGET } from '@/common/paydayBudget.js'

function getLoginRuntime() {
	let systemInfo = {}
	try {
		systemInfo = uni.getSystemInfoSync() || {}
	} catch (error) {
		systemInfo = {}
	}

	let socialType = 4
	// #ifdef APP-PLUS
	socialType = String(systemInfo.platform || '').toLowerCase() === 'android' ? 5 : 6
	// #endif

	return {
		appBrand: systemInfo.appName || '哆米记账',
		osName: systemInfo.osName || systemInfo.platform || 'H5',
		socialType,
		systemInfo
	}
}

export function getAppUpdateConfig(appName = '哆米记账') {
	return request({
		url: `/mall_admin/ua/app/sys_config/get/value/config/${encodeURIComponent(appName)}`,
		method: 'GET',
		withToken: false,
		timeout: 20000
	})
}

// 获取验证码
export function sendLoginCode(mobile) {
	return request({
		url: '/mall_biz/ua/sms/verification_code/login_whocode',
		method: 'PUT',
		data: { mobile },
		withToken: false
	})
}

// 验证码登录
export function loginWithCode(mobile, validCode) {
	const runtime = getLoginRuntime()
	const data = {
		sysType: 0,
		socialType: runtime.socialType,
		tempUid: '',
		userName: mobile,
		mobile,
		validCode,
		appBrand: runtime.appBrand,
		osName: runtime.osName,
		loginStatus: 1
	}

	// #ifdef APP-PLUS
	const { systemInfo } = runtime
	if (String(systemInfo.platform || '').toLowerCase() === 'android') {
		try {
			if (plus.device && plus.device.imei) data.imei = plus.device.imei
		} catch (error) {}
		if (systemInfo.oaid) data.oaid = systemInfo.oaid
	}
	if (systemInfo.brand) data.brand = systemInfo.brand
	// #endif

	return request({
		url: '/mall_auth/ua/login_with_code',
		method: 'POST',
		data,
		withToken: false
	})
}

// 账号密码登录
export function loginWithPassword(mobile, password) {
	const runtime = getLoginRuntime()
	return request({
		url: '/mall_auth/ua/login',
		method: 'POST',
		data: {
			sysType: 0,
			socialType: runtime.socialType,
			tempUid: '',
			userName: mobile,
			passWord: encrypt(password, 0),
			appBrand: runtime.appBrand,
			osName: runtime.osName,
			loginStatus: 2
		},
		withToken: false
	})
}

export function getUserDetail() {
	return request({
		url: '/mall_user/user/ma/user_detail_info',
		method: 'GET'
	})
}

export function updateUserInfo(data) {
	return request({
		url: '/mall_user/user/set_user_info',
		method: 'PUT',
		data
	})
}

export function getUserConfig(key) {
	return request({
		url: `/mall_admin/ua/app/sys_config/get/other/value/config/${encodeURIComponent(key)}`,
		method: 'GET'
	})
}

export function getSystemConfig(key) {
	return request({
		url: `/mall_admin/ua/app/sys_config/get/value/config/${encodeURIComponent(key)}`,
		method: 'GET',
		baseUrl: uni.getStorageSync('agreementApiBaseUrl') || config.baseUrl,
		withToken: false
	})
}

export function saveUserConfig(paramKey, paramValue, remark) {
	return request({
		url: '/mall_admin/p/sys_config/ua/other/save',
		method: 'POST',
		data: {
			paramKey,
			paramValue,
			remark
		}
	})
}

export function logout() {
	return request({
		url: '/mall_auth/ma/login_out',
		method: 'POST'
	})
}

export function destroyUser(forceDestroy = false) {
	return request({
		url: `/mall_user/user/destroy_user?forceDestroy=${forceDestroy ? 'true' : 'false'}`,
		method: 'GET'
	})
}

export async function destroyAccount() {
	const phone = getStoredPhone()
	if (phone) {
		await Promise.all([
			saveUserConfig(`${phone}BillMoney`, JSON.stringify([]), '哆米记账账单数据'),
			saveUserConfig(`${phone}SavingsPlan`, 'null', '哆米记账攒钱计划'),
			saveUserConfig(`${phone}MonthlyBudgets`, JSON.stringify({}), '哆米记账月度预算'),
			saveUserConfig(`${phone}PaydayBudget`, JSON.stringify(DEFAULT_PAYDAY_BUDGET), '哆米记账发薪日周期预算'),
			saveUserConfig(`${phone}${AA_SPLIT_CONFIG_SUFFIX}`, JSON.stringify([]), '哆米记账AA分账'),
			saveUserConfig(`${phone}${SUBSCRIPTION_CONFIG_SUFFIX}`, JSON.stringify([]), '哆米记账订阅管理')
		])
	}
	return destroyUser(false)
}

export function readJsonConfig(value, fallback) {
	if (value === null || value === undefined || value === '') return fallback
	if (typeof value === 'object') {
		if (value.paramValue !== undefined) return readJsonConfig(value.paramValue, fallback)
		if (value.value !== undefined && (typeof value.value === 'string' || typeof value.value === 'object')) {
			return readJsonConfig(value.value, fallback)
		}
		return value
	}

	try {
		return JSON.parse(value)
	} catch (error) {
		return fallback
	}
}

export function getStoredPhone() {
	const user = uni.getStorageSync('user_info') || {}
	return user.phone || user.mobile || uni.getStorageSync('login_account') || ''
}

export function getAccessToken(payload) {
	if (!payload) return ''
	if (typeof payload === 'string') return payload
	return payload.accessToken || payload.token || (payload.data && (payload.data.accessToken || payload.data.token)) || ''
}

export async function loadCurrentUserData() {
	const user = await getUserDetail().catch(() => uni.getStorageSync('user_info') || {})
	const userInfo = user || {}
	const phone = userInfo.phone || userInfo.mobile || getStoredPhone()
	const [billResult, savingsResult, aaSplitResult, subscriptionResult] = await Promise.all([
		phone ? getUserConfig(`${phone}BillMoney`).then((value) => ({ loaded: true, value })).catch(() => ({ loaded: false, value: null })) : Promise.resolve({ loaded: false, value: null }),
		phone ? getUserConfig(`${phone}SavingsPlan`).then((value) => ({ loaded: true, value })).catch(() => ({ loaded: false, value: null })) : Promise.resolve({ loaded: false, value: null }),
		phone ? getUserConfig(`${phone}${AA_SPLIT_CONFIG_SUFFIX}`).then((value) => ({ loaded: true, value })).catch(() => ({ loaded: false, value: null })) : Promise.resolve({ loaded: false, value: null }),
		phone ? getUserConfig(`${phone}${SUBSCRIPTION_CONFIG_SUFFIX}`).then((value) => ({ loaded: true, value })).catch(() => ({ loaded: false, value: null })) : Promise.resolve({ loaded: false, value: null })
	])

	const localBills = uni.getStorageSync('mock_bill_data')
	const localSavingsPlan = uni.getStorageSync('savings_plan')
	const bills = billResult.loaded ? readJsonConfig(billResult.value, []) : (Array.isArray(localBills) ? localBills : [])
	const savingsPlan = savingsResult.loaded ? readJsonConfig(savingsResult.value, null) : readJsonConfig(localSavingsPlan, null)
	const remoteAaSplit = readJsonConfig(aaSplitResult.value, [])
	const remoteSubscriptions = readJsonConfig(subscriptionResult.value, [])
	const aaSplit = aaSplitResult.loaded ? remoteAaSplit : []
	const subscribeManagement = subscriptionResult.loaded ? remoteSubscriptions : []
	uni.setStorageSync('user_info', userInfo)
	if (phone) uni.setStorageSync('login_account', phone)
	uni.setStorageSync('mock_bill_data', Array.isArray(bills) ? bills : [])
	uni.setStorageSync('savings_plan', savingsPlan)
	uni.setStorageSync(AA_SPLIT_STORAGE_KEY, Array.isArray(aaSplit) ? aaSplit : [])
	uni.setStorageSync(SUBSCRIPTION_STORAGE_KEY, Array.isArray(subscribeManagement) ? subscribeManagement : [])

	return {
		user: userInfo,
		bills: Array.isArray(bills) ? bills : [],
		savingsPlan,
		aaSplit: Array.isArray(aaSplit) ? aaSplit : [],
		subscribeManagement: Array.isArray(subscribeManagement) ? subscribeManagement : []
	}
}

export async function loadBillData() {
	let bills = uni.getStorageSync('mock_bill_data')
	if (!Array.isArray(bills)) bills = []

	const phone = getStoredPhone()
	if (!phone || !uni.getStorageSync('App-Token')) return bills

	try {
		const billConfig = await getUserConfig(`${phone}BillMoney`)
		const remoteBills = readJsonConfig(billConfig, null)
		if (Array.isArray(remoteBills) && (remoteBills.length || !bills.length)) {
			bills = remoteBills
			uni.setStorageSync('mock_bill_data', bills)
		}
	} catch (error) {
		// Keep locally saved records when the remote configuration is unavailable.
	}

	return bills
}

function formatBillTime(value) {
	const text = String(value || '').trim()
	const match = text.match(/[ T](\d{1,2}):(\d{2})/) || text.match(/^(\d{1,2}):(\d{2})/)
	if (!match) return '时间未记录'

	const hour = String(Number(match[1])).padStart(2, '0')
	return `${hour}:${match[2]}`
}

export function toBillItem(item, index = 0) {
	const amount = Number(item.money || item.amount || 0)
	const isIncome = item.tradeType === '收入' || item.type === 'in' || item.type === 2 || item.type === '2'
	const date = String(item.fullDate || item.date || item.time || '')
	const rawCategory = item.category && typeof item.category === 'object'
		? (item.category.name || item.category.value)
		: (item.category || item.categoryValue || item.categoryId)
	const normalizedCategory = normalizeCategoryKey(rawCategory)
	const categoryInfo = getBillCategoryByName(normalizedCategory) || getBillCategoryByValue(normalizedCategory)
	const category = categoryInfo ? categoryInfo.name : (normalizedCategory || '其他')

	return {
		id: item.id || `remote-${index}`,
		name: item.remark || category,
		time: formatBillTime(date),
		fullDate: date,
		submittedAt: item.submittedAt || '',
		category,
		amount: `${isIncome ? '+' : '-'}¥${formatAmount(Math.abs(amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
		money: Math.abs(amount),
		iconPath: categoryInfo ? categoryInfo.iconPath : getCategoryIcon(category),
		tone: categoryInfo ? categoryInfo.tone : getCategoryTone(category),
		type: isIncome ? 'in' : 'out',
		tradeType: isIncome ? '收入' : '支出'
	}
}

const categoryVisuals = {
	餐饮: ['/static/images/category/icon_food.png', 'tone-coral'],
	交通: ['/static/images/category/icon_trans.png', 'tone-ocean'],
	购物: ['/static/images/category/icon_shopping.png', 'tone-murex'],
	娱乐: ['/static/images/category/icon_fun.png', 'tone-sand'],
	医疗: ['/static/images/category/icon_medical.png', 'tone-pink'],
	教育: ['/static/images/category/icon_study.png', 'tone-rose'],
	电影: ['/static/images/category/icon_movie.png', 'tone-violet'],
	旅行: ['/static/images/category/icon_travel.png', 'tone-sky'],
	通信: ['/static/images/category/icon_phone.png', 'tone-olive'],
	房租: ['/static/images/category/icon_rent.png', 'tone-olive'],
	水电: ['/static/images/category/icon_utility.png', 'tone-cyan'],
	煤气: ['/static/images/category/icon_gas.png', 'tone-amber'],
	公益: ['/static/images/category/icon_charity.png', 'tone-lime'],
	工资: ['/static/images/category/icon_salary.png', 'tone-blue'],
	奖金: ['/static/images/category/icon_bonus.png', 'tone-gold'],
	兼职: ['/static/images/category/icon_part_time.png', 'tone-indigo'],
	稿费: ['/static/images/category/icon_royalty.png', 'tone-plum'],
	理财: ['/static/images/category/icon_finance.png', 'tone-mint'],
	退款: ['/static/images/category/icon_refund.png', 'tone-peach'],
	补助: ['/static/images/category/icon_subsidy.png', 'tone-lavender'],
	收入: ['/static/images/category/icon_income.png', 'tone-foam']
}

function getCategoryIcon(category) {
	return (categoryVisuals[category] || ['/static/images/category/icon_other.png', 'tone-slate'])[0]
}

function getCategoryTone(category) {
	return (categoryVisuals[category] || ['/static/images/category/icon_other.png', 'tone-slate'])[1]
}

export function groupBillsByDate(items) {
	const groups = {}
	items.forEach((item) => {
		const date = String(item.fullDate || item.date || item.time || '').trim()
		const dateMatch = date.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)
		const day = dateMatch ? dateMatch[0].replace(/\//g, '-') : (date.split(/[ T]/)[0] || '更早')
		if (!groups[day]) groups[day] = []
		groups[day].push(item)
	})

	return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((date) => ({ date, list: groups[date] }))
}
