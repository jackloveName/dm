<template>
	<view class="agreement-webview-page" :style="pageHeightStyle">
		<web-view v-if="webViewUrl" :src="webViewUrl" @message="handleMessage"></web-view>
		<view v-else class="agreement-loading">
			<text>正在加载协议确认页...</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				webViewUrl: ''
			}
		},
		onLoad(options = {}) {
			this.buildWebViewUrl(options.token || uni.getStorageSync('App-Token') || '')
		},
		methods: {
			buildWebViewUrl(token) {
				const systemInfo = uni.getSystemInfoSync ? uni.getSystemInfoSync() : {}
				const statusHeight = systemInfo.statusBarHeight || 0
				const baseUrl = systemInfo.platform === 'h5' || systemInfo.platform === 'web'
					? (uni.getStorageSync('agreementWebViewUrl') || 'http://192.168.1.105:8088/')
					: (uni.getStorageSync('agreementWebViewUrl') || 'https://h5.huajinyx.com/')
				const query = `token=${encodeURIComponent(token)}&statusHeight=${encodeURIComponent(statusHeight)}`
				this.webViewUrl = `${baseUrl}${baseUrl.indexOf('?') >= 0 ? '&' : '?'}${query}`
			},
			handleMessage(event) {
				const messages = event && event.detail && event.detail.data
				const message = Array.isArray(messages) ? messages[messages.length - 1] : messages
				if (!message || typeof message !== 'object') return

				if (message.type === 'agreementConfirmed' || message.type === 'confirmAgreement') {
					uni.reLaunch({ url: '/pages/home/index' })
					return
				}

				if (message.type === 'logout' || message.type === 'deleteAccount') {
					uni.removeStorageSync('App-Token')
					uni.reLaunch({ url: '/pages/login' })
				}
			}
		}
	}
</script>

<style>
	.agreement-webview-page {
		width: 100%;
		height: var(--app-window-height, 100vh);
		min-height: var(--app-window-height, 100vh);
		background: #f7f2e8;
	}

	.agreement-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 25rpx;
		color: #7e8896;
	}
</style>
