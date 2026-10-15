<template>
	<view class="bd-page terms-page" :class="themeClass" :style="pageHeightStyle">
		<view class="terms-nav">
			<go-back inline fallback-url="/pages/login" fallback-mode="reLaunch" />
			<text class="terms-nav-title">{{ pageTitle }}</text>
			<view class="nav-placeholder"></view>
		</view>
		<view class="terms-card">
			<rich-text v-if="remoteContent" class="terms-content" :nodes="remoteContent"></rich-text>
		</view>

	</view>
</template>
<script>
	import GoBack from '@/components/goBack/index.vue'
	import { getSystemConfig } from '@/api/index.js'
	import { PRIVACY_PROTOCOL, REGISTER_PROTOCOL } from '@/common/protocols.js'

	const PROTOCOLS = {
		privacy: {
			title: '隐私政策',
			key: 'DMJZ_PRIVACY_PROTOC'
		},
		register: {
			title: '平台注册协议',
			key: 'DMJZ_REGISTER_PROTOC'
		}
	}

	export default {
		components: {
			GoBack
		},
		data() {
			return {
				pageTitle: '隐私政策',
				protocolKey: 'DMJZ_PRIVACY_PROTOC',
				remoteContent: PRIVACY_PROTOCOL,
				updateDate: this.getCurrentYearMonth()
			}
		},
		onLoad(options = {}) {
			this.configureProtocol(options)
			this.loadAgreement()
		},
		methods: {
			getCurrentYearMonth() {
				const date = new Date()
				return `${date.getFullYear()}年${date.getMonth() + 1}月`
			},
			configureProtocol(options = {}) {
				const protocol = options.key === 'DMJZ_REGISTER_PROTOC' || options.title === '平台注册协议'
					? PROTOCOLS.register
					: PROTOCOLS.privacy

				this.pageTitle = options.title || protocol.title
				this.protocolKey = protocol.key
			},
			getConfigText(value) {
				if (value === null || value === undefined || value === '') return ''
				if (typeof value === 'string') return value
				if (typeof value !== 'object') return String(value)
				return this.getConfigText(value.paramValue !== undefined
					? value.paramValue
					: value.value !== undefined
						? value.value
						: value.content !== undefined
							? value.content
							: value.text)
			},
			getPlatformContact() {
        if(uni.getSystemInfoSync().platform==='ios'){
          return { name: 'Rinze Loop', email: 'rinzeloop@icloud.com' }
        }else{
          return { name: '湖北黩歆科技有限公司', email: 'developking6@outlook.com' }
        }
			},
			replacePlaceholders(content) {
				const contact = this.getPlatformContact()
				return String(content)
					.replace(/\$\{name\}/g, contact.name)
					.replace(/\$\{email\}/g, contact.email)
			},
			escapeHtml(content) {
				return String(content)
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#39;')
			},
			formatContent(content) {
				const text = this.replacePlaceholders(content).trim()
        // console.log('text:', text);
				if (!text) return ''
				if (/<[a-z][\s\S]*>/i.test(text)) return text
				return text
					.split(/\r?\n/)
					.map((line) => `<p>${this.escapeHtml(line || ' ')}</p>`)
					.join('')
			},
			async loadAgreement() {
				const localContent = this.protocolKey === PROTOCOLS.register.key ? REGISTER_PROTOCOL : PRIVACY_PROTOCOL
				try {
					const content = await getSystemConfig(this.protocolKey)
					this.remoteContent = this.formatContent(this.getConfigText(content)) || localContent
				} catch (error) {
					this.remoteContent = localContent
				}
			}
		}
	}
</script>

<style>
	.terms-page {
		padding-top: calc(34rpx + var(--app-safe-top, env(safe-area-inset-top)));
		padding-bottom: 90rpx;
	}

	.terms-page.reading-gate {
		padding-bottom: calc(230rpx + var(--app-safe-bottom, env(safe-area-inset-bottom)));
	}

	.terms-nav {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-placeholder {
		width: 72rpx;
		height: 72rpx;
	}

	.terms-nav-title {
		position: absolute;
		left: 50%;
		top: 50%;
		font-size: 34rpx;
		font-weight: 800;
		color: #0d2839;
		transform: translate(-50%, -50%);
	}

	.terms-card {
		margin-top: 34rpx;
		padding: 36rpx 34rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.78);
		box-shadow: 0 14rpx 38rpx rgba(20, 58, 85, 0.06);
		box-sizing: border-box;
	}

	.terms-reading-tip {
		display: flex;
		align-items: center;
		gap: 18rpx;
		margin-top: 28rpx;
		padding: 24rpx 26rpx;
		border: 1rpx solid rgba(143, 128, 155, 0.18);
		border-radius: 26rpx;
		background: rgba(255, 255, 255, 0.78);
		box-shadow: 0 12rpx 32rpx rgba(20, 58, 85, 0.06);
	}

	.terms-reading-tip.complete {
		border-color: rgba(74, 139, 121, 0.24);
		background: rgba(231, 246, 239, 0.9);
	}

	.terms-reading-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		flex: 0 0 64rpx;
		border-radius: 999rpx;
		background: #143a55;
		color: #fff;
		font-size: 27rpx;
		font-weight: 800;
	}

	.terms-reading-tip.complete .terms-reading-mark {
		background: #4a8b79;
	}

	.terms-reading-copy {
		flex: 1;
		min-width: 0;
	}

	.terms-reading-title,
	.terms-reading-desc {
		display: block;
	}

	.terms-reading-title {
		font-size: 27rpx;
		font-weight: 800;
		color: #143a55;
	}

	.terms-reading-desc {
		margin-top: 6rpx;
		font-size: 22rpx;
		line-height: 1.55;
		color: #7e8896;
	}

	.terms-reading-footer {
		position: fixed;
		left: 28rpx;
		right: 28rpx;
		bottom: calc(24rpx + var(--app-safe-bottom, env(safe-area-inset-bottom)));
		z-index: 20;
		padding: 20rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: rgba(255, 253, 248, 0.94);
		box-shadow: 0 18rpx 48rpx rgba(13, 40, 57, 0.16);
		backdrop-filter: blur(20rpx);
		box-sizing: border-box;
	}

	.terms-reading-button {
		width: 100%;
		padding: 20rpx 24rpx;
		border-radius: 999rpx;
		background: #d9dedf;
		color: #7e8896;
		font-size: 27rpx;
		font-weight: 800;
		line-height: 1.4;
	}

	.terms-reading-button::after {
		border: 0;
	}

	.terms-reading-button.ready {
		background: #143a55;
		color: #fff;
		box-shadow: 0 14rpx 30rpx rgba(20, 58, 85, 0.2);
	}

	.terms-reading-button[disabled] {
		opacity: 1;
	}

	.terms-reading-note {
		display: block;
		margin-top: 12rpx;
		font-size: 20rpx;
		text-align: center;
		color: #9aa2ab;
	}

	.terms-date,
	.section-title,
	.section-copy {
		display: block;
	}

	.terms-date {
		margin-top: 12rpx;
		font-size: 22rpx;
		color: #7e8896;
	}

	.terms-content {
		display: block;
		margin-top: 30rpx;
		font-size: 25rpx;
		line-height: 1.8;
		color: #52606c;
	}

	.terms-content p {
		display: block;
		margin: 0 0 20rpx;
		font-size: 25rpx;
		line-height: 1.8;
		color: #52606c;
	}

	.terms-section {
		margin-top: 32rpx;
		padding-top: 28rpx;
		border-top: 1rpx solid rgba(20, 58, 85, 0.08);
	}

	.section-title {
		font-size: 29rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.section-copy {
		margin-top: 12rpx;
		font-size: 25rpx;
		line-height: 1.8;
		color: #52606c;
	}

	@media screen and (min-width: 768px) {
		.terms-reading-footer {
			left: 50%;
			right: auto;
			width: 374px;
			transform: translateX(-50%);
		}
	}
</style>
