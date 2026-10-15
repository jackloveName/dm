import App from './App'
import { getSavedShellTheme } from './common/theme.js'

function getSystemMetrics() {
	try {
		const systemInfo = typeof uni !== 'undefined' && uni.getSystemInfoSync
			? uni.getSystemInfoSync()
			: {}
		const safeAreaInsets = systemInfo.safeAreaInsets || {}
		const safeArea = systemInfo.safeArea || {}
		const screenHeight = Number(systemInfo.screenHeight || 0)
		const safeAreaBottom = screenHeight && safeArea.bottom
			? Math.max(screenHeight - Number(safeArea.bottom), 0)
			: 0
		return {
			windowHeight: Number(systemInfo.windowHeight || 0),
			safeTop: Number(safeAreaInsets.top || safeArea.top || systemInfo.statusBarHeight || 0),
			safeBottom: Number(safeAreaInsets.bottom || safeAreaBottom)
		}
	} catch (error) {
		return {
			windowHeight: 0,
			safeTop: 0,
			safeBottom: 0
		}
	}
}

const appThemeMixin = {
	data() {
		const systemMetrics = getSystemMetrics()

		return {
			appTheme: getSavedShellTheme(),
			windowHeight: systemMetrics.windowHeight,
			safeTop: systemMetrics.safeTop,
			safeBottom: systemMetrics.safeBottom
		}
	},
	onShow() {
		this.appTheme = getSavedShellTheme()
		this.updateWindowHeight()
	},
	onResize() {
		this.updateWindowHeight()
	},
	computed: {
		themeClass() {
			return this.appTheme.className
		},
		pageHeightStyle() {
			const style = {}
			if (this.windowHeight) style.minHeight = `${this.windowHeight}px`
			if (this.safeTop) style['--app-safe-top'] = `${this.safeTop}px`
			if (this.safeBottom) style['--app-safe-bottom'] = `${this.safeBottom}px`
			if (this.windowHeight) style['--app-window-height'] = `${this.windowHeight}px`
			return style
		}
	},
	methods: {
		updateWindowHeight() {
			const metrics = getSystemMetrics()
			if (metrics.windowHeight) this.windowHeight = metrics.windowHeight
			this.safeTop = metrics.safeTop
			this.safeBottom = metrics.safeBottom
		}
	}
}

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.mixin(appThemeMixin)
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	app.mixin(appThemeMixin)
	return {
		app
	}
}
// #endif
