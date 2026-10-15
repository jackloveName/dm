import config from '@/config.js'
const DEFAULT_BASE_URL = config.baseUrl || 'https://ogw.whdly.cn'
let redirectingToLogin = false

function getBaseUrl() {
	return uni.getStorageSync('apiBaseUrl') || DEFAULT_BASE_URL
}

function getErrorMessage(payload, fallback = '请求失败') {
	if (!payload) return fallback
	return payload.msg || payload.message || payload.error || fallback
}

function getRequestErrorMessage(error) {
	const message = error && (error.errMsg || error.message)
	if (/ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|NETWORK_ERR|Network Error|Failed to fetch|timeout|resolve host|Name resolution/i.test(message || '')) {
		return '服务暂时无法连接，请检查网络或稍后重试'
	}
	return message || '网络请求失败'
}

function isUnauthorizedResponse(response, payload, requestUrl) {
	const statusCode = Number(response && response.statusCode)
	const code = payload && payload.code
	const message = String(payload && (payload.msg || payload.message) || '').trim().toLowerCase()
	const isUserDetailRequest = String(requestUrl || '').includes('/mall_user/user/ma/user_detail_info')

	return statusCode === 401 ||
		code === 401 ||
		code === '401' ||
		(isUserDetailRequest && message === 'unauthorized')
}

function redirectToLogin() {
	if (redirectingToLogin) return
	redirectingToLogin = true

	uni.removeStorageSync('App-Token')
	uni.removeStorageSync('user_info')

	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
	const currentPage = pages.length ? pages[pages.length - 1] : null
	if (currentPage && currentPage.route === 'pages/login') {
		redirectingToLogin = false
		return
	}

	uni.reLaunch({
		url: '/pages/login',
		complete: () => {
			setTimeout(() => {
				redirectingToLogin = false
			}, 300)
		}
	})
}

export function request(options = {}) {
	const {
		url,
		method = 'GET',
		data,
		headers = {},
		timeout = 10000,
		withToken = true,
		baseUrl = ''
	} = options

	return new Promise((resolve, reject) => {
		const token = uni.getStorageSync('App-Token') || ''
		const requestHeaders = { ...headers }

		if (withToken && token && !requestHeaders.Authorization) {
			requestHeaders.Authorization = token
		}

		uni.request({
			url: `${baseUrl || getBaseUrl()}${url}`,
			method,
			data,
			header: requestHeaders,
			timeout,
			success: (response) => {
				const payload = response && response.data
				const code = payload && payload.code

				if (isUnauthorizedResponse(response, payload, url)) {
					redirectToLogin()
					reject(new Error('登录已失效，请重新登录'))
					return
				}

				if (code === '00000') {
					resolve(payload.data)
					return
				}

				if (code === undefined || code === null || code === 200 || code === '200') {
					resolve(payload && payload.data !== undefined ? payload.data : payload)
					return
				}

				reject(new Error(getErrorMessage(payload, `请求失败（${code}）`)))
			},
			fail: (error) => {
				reject(new Error(getRequestErrorMessage(error)))
			}
		})
	})
}

export function requestQuietly(options = {}) {
	return request(options).catch(() => null)
}
