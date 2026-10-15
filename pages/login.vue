<template>
	<view class="login-page" :class="themeClass" :style="pageHeightStyle">
		<view class="ambient ambient-pink"></view>
		<view class="ambient ambient-foam"></view>

		<view class="login-content">
			<view class="brand-lockup">
				<view class="shell-mark" aria-label="哆米记账">
					<view class="shell-highlight"></view>
					<view class="shell-ridge ridge-left"></view>
					<view class="shell-ridge ridge-center"></view>
					<view class="shell-ridge ridge-right"></view>
				</view>
				<text class="brand-name">哆米记账</text>
			</view>

			<view class="welcome-copy">
				<text class="eyebrow">YOUR MONEY RHYTHM</text>
				<text class="title">欢迎回来</text>
			</view>

			<view class="login-card">
				<view class="field-group">
					<text class="field-label">手机号</text>
					<view class="field-box" :class="{ focused: activeField === 'account' }">
						<text class="field-icon lock-icon">◆</text>
						<input
							v-model="account"
							class="field-input"
							placeholder="请输入手机号"
							placeholder-class="placeholder"
							:focus="activeField === 'account'"
							@focus="activeField = 'account'"
							@blur="activeField = ''"
						/>
					</view>
				</view>

				<view v-if="loginMode === 'password'" class="field-group password-group">
					<text class="field-label">密码</text>
					<view class="field-box" :class="{ focused: activeField === 'password' }">
						<text class="field-icon lock-icon">◆</text>
						<input
							v-model="password"
							class="field-input"
							:password="!showPassword"
							placeholder="请输入密码"
							placeholder-class="placeholder"
							:focus="activeField === 'password'"
							@focus="activeField = 'password'"
							@blur="activeField = ''"
						/>
						<text class="password-toggle" @tap="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
					</view>
				</view>

				<view v-else class="field-group code-group">
					<text class="field-label">验证码</text>
					<view class="field-box" :class="{ focused: activeField === 'code' }">
						<text class="field-icon lock-icon">◆</text>
						<input
							v-model="verificationCode"
							class="field-input"
							type="number"
							maxlength="6"
							placeholder="请输入验证码"
							placeholder-class="placeholder"
							:focus="activeField === 'code'"
							@focus="activeField = 'code'"
							@blur="activeField = ''"
						/>
						<button class="code-button" :disabled="codeCountdown > 0 || isSendingCode" @tap="handleGetCode">
							{{ codeCountdown > 0 ? `${codeCountdown}s` : (isSendingCode ? '获取中…' : '获取验证码') }}
						</button>
					</view>
				</view>

				<button class="login-button" :class="{ loading: isSubmitting }" :disabled="isSubmitting" @tap="handleLogin">
					{{ isSubmitting ? '正在登录中......' : '登录' }}
					<text v-if="!isSubmitting" class="button-arrow">→</text>
				</button>

			</view>

			<view class="register-row">
				<text>还没有账号？</text>
				<text class="register-link" @tap="switchLoginMode">{{ loginMode === 'password' ? '使用验证码登录' : '使用密码登录' }}</text>
			</view>

			<view class="agreement-row" @tap="toggleAgreement">
				<view class="agreement-radio" :class="{ checked: agreementChecked }">
					<text v-if="agreementChecked">✓</text>
				</view>
				<view class="agreement-copy">
					<text>若手机号未注册将默认同意使用该手机号注册账号，已阅读并同意</text>
					<text class="agreement-link" @tap.stop="openPrivacyReader">《隐私政策》</text>
					<text>和</text>
					<text class="agreement-link" @tap.stop="openAgreement('/pages/mine/terms/index?title=平台注册协议&key=DMJZ_REGISTER_PROTOC')">《平台注册协议》</text>
				</view>
			</view>

			<text class="footer-note">从一个发薪日开始，把这一周期过得清楚</text>
		</view>

		<view v-if="isSubmitting" class="login-loading-mask" @tap.stop @touchmove.stop.prevent>
			<view class="login-loading-panel" @touchmove.stop>
				<view class="login-loading-spinner"></view>
				<text>正在登录中......</text>
			</view>
		</view>

	</view>
</template>

<script>
	import { getAccessToken, loadCurrentUserData, loginWithCode, loginWithPassword, sendLoginCode } from '@/api/index.js'
	import { AA_SPLIT_STORAGE_KEY } from '@/common/aaSplit.js'
	import { SUBSCRIPTION_STORAGE_KEY } from '@/common/subscription.js'

	export default {
		data() {
			return {
				account: '',
				password: '',
				verificationCode: '',
				loginMode: 'verification',
				codeCountdown: 0,
				codeTimer: null,
				isSendingCode: false,
				activeField: '',
				showPassword: false,
				isSubmitting: false,
				sessionRestoring: false,
				agreementChecked: false
			}
		},
		methods: {
			restoreAuthenticatedSession() {
				if (this.sessionRestoring || this.isSubmitting || !uni.getStorageSync('App-Token')) return
				this.sessionRestoring = true
				setTimeout(() => {
					if (uni.getStorageSync('App-Token')) {
						this.goHome()
						return
					}
					this.sessionRestoring = false
				}, 0)
			},
			toggleAgreement() {
				this.agreementChecked = !this.agreementChecked
			},
			openPrivacyReader() {
				this.openAgreement('/pages/mine/terms/index?title=隐私政策&key=DMJZ_PRIVACY_PROTOC&source=login')
			},
			openAgreement(url) {
				uni.navigateTo({
					url,
					fail: () => {
						uni.showToast({ title: '页面暂不可用', icon: 'none' })
					}
				})
			},
			switchLoginMode() {
				this.loginMode = this.loginMode === 'password' ? 'verification' : 'password'
				this.activeField = ''
			},
			async handleGetCode() {
				if (this.codeCountdown > 0 || this.isSendingCode) return
				const mobile = this.account.trim()
				if (!mobile) {
					uni.showToast({ title: '请先输入手机号', icon: 'none' })
					return
				}
				this.isSendingCode = true
				try {
					await sendLoginCode(mobile)
					this.startCodeCountdown()
					uni.showToast({ title: '验证码已发送', icon: 'none' })
				} catch (error) {
					uni.showToast({ title: error.message || '验证码发送失败', icon: 'none' })
				} finally {
					this.isSendingCode = false
				}
			},
			startCodeCountdown() {
				if (this.codeTimer) {
					clearInterval(this.codeTimer)
				}
				this.codeCountdown = 60
				this.codeTimer = setInterval(() => {
					this.codeCountdown -= 1
					if (this.codeCountdown <= 0) {
						clearInterval(this.codeTimer)
						this.codeTimer = null
					}
				}, 1000)
			},
			async handleLogin() {
				if (this.isSubmitting) return
				if (!this.account.trim()) {
					uni.showToast({ title: '请输入手机号', icon: 'none' })
					return
				}
				if (this.loginMode === 'password') {
					if (!this.password.trim()) {
						uni.showToast({ title: '请输入密码', icon: 'none' })
						return
					}
				} else if (!this.verificationCode.trim()) {
					uni.showToast({ title: '请输入验证码', icon: 'none' })
					return
				}
				if (!this.agreementChecked) {
					uni.showToast({ title: '请先阅读并同意协议', icon: 'none' })
					return
				}
				this.isSubmitting = true
				try {
					const account = this.account.trim()
					const loginResult = this.loginMode === 'password'
						? await loginWithPassword(account, this.password.trim())
						: await loginWithCode(account, this.verificationCode.trim())
					const token = getAccessToken(loginResult)

					if (!token) {
						throw new Error('登录成功但未返回 Token')
					}

					const previousAccount = String(uni.getStorageSync('login_account') || '')
					if (previousAccount && previousAccount !== account) {
						['user_info', 'profileAvatar', 'profileNickname', 'mock_bill_data', 'open_bill_list', 'savings_plan', 'monthlyBudgets', 'paydayBudgetSettings', AA_SPLIT_STORAGE_KEY, SUBSCRIPTION_STORAGE_KEY].forEach((key) => {
							uni.removeStorageSync(key)
						})
					}

					uni.setStorageSync('App-Token', token)
					uni.setStorageSync('login_account', account)
					const currentUserData = await loadCurrentUserData()
					if (currentUserData.bills.length) {
						uni.setStorageSync('checkLowBalanceAfterLogin', true)
					} else {
						uni.removeStorageSync('checkLowBalanceAfterLogin')
					}
					this.isSubmitting = false
					uni.showToast({ title: '登录成功', icon: 'success' })
					setTimeout(() => {
						this.goHome()
					}, 650)
				} catch (error) {
					this.isSubmitting = false
					uni.showToast({ title: error.message || '登录失败', icon: 'none' })
				}
			},
			goHome() {
				const homeUrl = '/pages/home/index'

				// #ifdef H5
				if (typeof window !== 'undefined') {
					uni.switchTab({
						url: homeUrl,
						fail: () => {
							window.location.hash = homeUrl
						}
					})
					return
				}
				// #endif

				uni.switchTab({
					url: homeUrl,
					fail: () => {
						this.sessionRestoring = false
						uni.reLaunch({ url: homeUrl })
					}
				})
			}
		},
		onLoad() {
			this.restoreAuthenticatedSession()
		},
		onShow() {
			this.restoreAuthenticatedSession()
		},
		onUnload() {
			if (this.codeTimer) {
				clearInterval(this.codeTimer)
				this.codeTimer = null
			}
		}
	}
</script>

<style>
	page {
		background: #f7f2e8;
		color: #1a2530;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
	}

	.login-page {
		position: relative;
		min-height: var(--app-window-height, 100vh);
		overflow: hidden;
		padding: calc(82rpx + var(--app-safe-top, env(safe-area-inset-top))) 44rpx 54rpx;
		background:
			radial-gradient(circle at 12% 4%, var(--shell-accent-soft), transparent 300rpx),
			radial-gradient(circle at 94% 26%, var(--shell-accent-deep), transparent 320rpx),
			var(--shell-background);
		box-sizing: border-box;
	}

	.ambient {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		filter: blur(2rpx);
	}

	.ambient-pink {
		top: -180rpx;
		left: -160rpx;
		width: 440rpx;
		height: 440rpx;
		background: radial-gradient(circle, rgba(240, 164, 142, 0.2), transparent 68%);
	}

	.ambient-foam {
		right: -210rpx;
		bottom: -120rpx;
		width: 450rpx;
		height: 450rpx;
		background: radial-gradient(circle, rgba(191, 224, 210, 0.34), transparent 70%);
	}

	.login-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 620rpx;
		margin: 0 auto;
	}

	.brand-lockup {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.shell-mark {
		position: relative;
		width: 126rpx;
		height: 126rpx;
		margin-bottom: 24rpx;
		border-radius: 52% 52% 46% 46%;
		background: linear-gradient(135deg, #f8d9dc 0%, #e8b4bc 34%, #b59ec2 68%, #7fb9a6 100%);
		box-shadow: 0 22rpx 40rpx rgba(201, 123, 134, 0.25);
		overflow: hidden;
	}

	.shell-highlight {
		position: absolute;
		inset: 15rpx;
		border-radius: 50%;
		background: radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.12) 70%);
	}

	.shell-ridge {
		position: absolute;
		top: 18rpx;
		bottom: 20rpx;
		z-index: 2;
		width: 2rpx;
		background: rgba(255, 255, 255, 0.48);
		transform-origin: bottom center;
	}

	.ridge-left { left: 46rpx; transform: rotate(-19deg); }
	.ridge-center { left: 62rpx; }
	.ridge-right { right: 45rpx; transform: rotate(19deg); }

	.brand-name {
		display: block;
		font-size: 44rpx;
		font-weight: 800;
		letter-spacing: 4rpx;
		color: #0d2839;
	}

	.brand-tagline {
		display: block;
		margin-top: 10rpx;
		font-size: 23rpx;
		color: #4a5764;
	}

	.welcome-copy {
		margin: 66rpx 0 28rpx;
		text-align: center;
	}

	.eyebrow {
		display: block;
		font-size: 21rpx;
		font-weight: 600;
		letter-spacing: 4rpx;
		color: #1f4e6e;
	}

	.title {
		display: block;
		margin-top: 12rpx;
		font-size: 52rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: #0d2839;
	}

	.description {
		display: block;
		margin-top: 12rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: #7e8896;
	}

	.login-card {
		padding: 34rpx 30rpx 30rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.09);
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.77);
		box-shadow: 0 18rpx 52rpx rgba(20, 58, 85, 0.1);
		backdrop-filter: blur(20rpx);
	}

	.field-group + .field-group {
		margin-top: 24rpx;
	}

	.field-label {
		display: block;
		margin: 0 8rpx 10rpx;
		font-size: 23rpx;
		font-weight: 600;
		color: #4a5764;
	}

	.field-box {
		display: flex;
		align-items: center;
		min-height: 92rpx;
		padding: 0 24rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 20rpx;
		background: rgba(251, 248, 242, 0.88);
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.field-box.focused {
		border-color: #b59ec2;
		box-shadow: 0 0 0 6rpx rgba(181, 158, 194, 0.14);
	}

	.field-icon {
		width: 34rpx;
		margin-right: 14rpx;
		font-size: 28rpx;
		font-weight: 700;
		text-align: center;
		color: #8a6b96;
	}

	.lock-icon {
		font-size: 17rpx;
		color: #3b6e89;
	}

	.field-input {
		flex: 1;
		min-width: 0;
		height: 58rpx;
		font-size: 27rpx;
		color: #1a2530;
	}

	.placeholder { color: #a4abb3; }

	.password-toggle {
		padding: 10rpx 0 10rpx 16rpx;
		font-size: 22rpx;
		color: #7e8896;
	}

	.code-icon {
		font-size: 26rpx;
		color: #4a8b79;
	}

	.code-button {
		flex-shrink: 0;
		margin: 0 0 0 14rpx;
		padding: 0 4rpx 0 16rpx;
		border-left: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 0;
		background: transparent;
		color: #8a6b96;
		font-size: 22rpx;
		font-weight: 600;
		line-height: 1.4;
	}

	.code-button::after {
		border: 0;
	}

	.code-button[disabled] {
		color: #a4abb3;
	}

	.register-link {
		color: #8a6b96;
	}

	.login-button {
		width: 100%;
		border-radius: 999rpx;
	}

	.login-button {
		margin-top: 32rpx;
		padding: 22rpx 30rpx;
		background: #143a55;
		color: #fbf8f2;
		font-size: 28rpx;
		font-weight: 700;
		letter-spacing: 3rpx;
		box-shadow: 0 14rpx 26rpx rgba(13, 40, 57, 0.22);
	}

	.login-button::after { border: 0; }

	.login-button.loading { opacity: 0.72; }

	.login-loading-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
		background: rgba(247, 242, 232, 0.72);
		backdrop-filter: blur(8rpx);
		box-sizing: border-box;
	}

	.login-loading-panel {
		display: flex;
		align-items: center;
		gap: 18rpx;
		min-width: 328rpx;
		padding: 26rpx 34rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 999rpx;
		background: rgba(255, 253, 248, 0.96);
		box-shadow: 0 20rpx 54rpx rgba(13, 40, 57, 0.14);
		box-sizing: border-box;
	}

	.login-loading-spinner {
		width: 32rpx;
		height: 32rpx;
		flex: 0 0 32rpx;
		border: 4rpx solid rgba(20, 58, 85, 0.14);
		border-top-color: #143a55;
		border-radius: 999rpx;
		animation: login-loading-rotate 0.8s linear infinite;
	}

	.login-loading-panel text {
		font-size: 25rpx;
		font-weight: 700;
		color: #143a55;
	}

	@keyframes login-loading-rotate {
		to { transform: rotate(360deg); }
	}

	.button-arrow {
		margin-left: 12rpx;
		font-size: 30rpx;
		font-weight: 400;
	}

	.register-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		margin-top: 30rpx;
		font-size: 23rpx;
		color: #7e8896;
	}

	.agreement-row {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 12rpx;
		margin-top: 28rpx;
		padding: 0 8rpx;
		box-sizing: border-box;
	}

	.agreement-radio {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28rpx;
		height: 28rpx;
		flex: 0 0 28rpx;
		margin-top: 5rpx;
		border: 2rpx solid rgba(20, 58, 85, 0.28);
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.72);
		box-sizing: border-box;
	}

	.agreement-radio.checked {
		border-color: #143a55;
		background: #143a55;
	}

	.agreement-radio text {
		display: block;
		font-size: 18rpx;
		font-weight: 800;
		line-height: 1;
		color: #fff;
	}

	.agreement-copy {
		flex: 1;
		min-width: 0;
		font-size: 21rpx;
		line-height: 1.7;
		color: #7e8896;
	}

	.agreement-copy text {
		display: inline;
	}

	.agreement-link {
		font-weight: 700;
		color: #1f4e6e;
	}

	.footer-note {
		display: block;
		margin-top: 54rpx;
		font-size: 20rpx;
		letter-spacing: 2rpx;
		text-align: center;
		color: rgba(31, 78, 110, 0.58);
	}

	@media screen and (min-width: 768px) {
		.login-page {
			max-width: 560px;
			margin: 0 auto;
			box-shadow: 0 24px 70px rgba(13, 40, 57, 0.14);
		}
	}
</style>
