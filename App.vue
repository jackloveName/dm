<script>
	import { openAddOnePage } from '@/common/tabbar.js'

	export default {
		data() {
			return {
				appInBackground: false
			}
		},
		onLaunch: function() {
			this.bindTabBarMidButton()
		},
		onShow: function() {
			if (this.appInBackground) {
				this.appInBackground = false
				if (uni.getStorageSync('App-Token')) {
					uni.switchTab({
						url: '/pages/home/index',
						fail: () => uni.reLaunch({ url: '/pages/home/index' })
					})
				} else {
					uni.reLaunch({ url: '/pages/login' })
				}
			}
		},
		onHide: function() {
			this.appInBackground = true
		},
		methods: {
			bindTabBarMidButton() {
				if (!uni.onTabBarMidButtonTap) return

				uni.onTabBarMidButtonTap(openAddOnePage)
			}
		}
	}
</script>

<style>
	page {
		background: #f7f2e8;
		color: #1a2530;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior-y: none;
	}

	/* H5 pages must grow with their content so the browser can scroll the document. */
	/* #ifdef H5 */
	html,
	body,
	#app,
	uni-app,
	uni-page,
	.uni-page,
	uni-page-wrapper,
		.uni-page-wrapper,
	uni-page-body,
	.uni-page-body {
		height: auto !important;
		min-height: 100% !important;
	}

	html,
	body,
	#app,
	uni-app,
	uni-page,
	.uni-page,
	uni-page-wrapper,
	.uni-page-wrapper,
	uni-page-body,
	.uni-page-body {
		min-height: 100vh !important;
	}

	body {
		overflow-x: hidden;
		overflow-y: auto;
	}

	page,
	uni-page-body,
	.uni-page-body {
		overflow-x: hidden;
		overflow-y: visible;
	}
	/* #endif */

	/* Keep touch gestures on an open modal from reaching the page underneath. */
	.editor-mask,
	.bill-editor-mask,
	.budget-editor-mask,
	.plan-editor-mask,
	.payday-prompt-mask,
	.low-balance-mask,
	.cancel-dialog-mask,
	.name-editor-mask,
	.action-dialog-mask,
	.login-loading-mask {
		touch-action: none;
		overflow: hidden;
	}

	.editor-panel,
	.bill-editor-panel,
	.budget-editor-panel,
	.plan-editor-panel,
	.payday-prompt-panel,
	.low-balance-panel,
	.cancel-dialog-panel,
	.name-editor-panel,
	.action-dialog-panel,
	.login-loading-panel {
		touch-action: pan-y;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	.bd-page {
		min-height: var(--app-window-height, 100vh);
		padding: calc(48rpx + var(--app-safe-top, env(safe-area-inset-top))) 28rpx 148rpx;
		background:
			radial-gradient(circle at 16% 2%, var(--shell-accent-soft), transparent 320rpx),
			radial-gradient(circle at 92% 12%, var(--shell-accent-deep), transparent 320rpx),
			var(--shell-background);
		box-sizing: border-box;
	}

	.theme-shell-pink {
		--shell-background: #f7f2e8;
		--shell-accent-soft: rgba(232, 180, 188, 0.42);
		--shell-accent-deep: rgba(127, 185, 166, 0.32);
	}

	.theme-shell-moon {
		--shell-background: #f7f4ef;
		--shell-accent-soft: rgba(197, 212, 222, 0.5);
		--shell-accent-deep: rgba(163, 191, 198, 0.36);
	}

	.theme-shell-foam {
		--shell-background: #edf6f1;
		--shell-accent-soft: rgba(172, 218, 202, 0.48);
		--shell-accent-deep: rgba(113, 180, 186, 0.32);
	}

	.theme-shell-coral {
		--shell-background: #fdf2ed;
		--shell-accent-soft: rgba(240, 197, 181, 0.52);
		--shell-accent-deep: rgba(214, 154, 143, 0.32);
	}

	.theme-shell-pearl {
		--shell-background: #f6f2f8;
		--shell-accent-soft: rgba(211, 199, 235, 0.46);
		--shell-accent-deep: rgba(176, 200, 226, 0.36);
	}

	.theme-shell-sand {
		--shell-background: #faf3e6;
		--shell-accent-soft: rgba(233, 214, 172, 0.5);
		--shell-accent-deep: rgba(188, 205, 180, 0.34);
	}

	.bd-row,
	.bd-header,
	.bd-card-head,
	.bd-list-row,
	.bd-tabbar {
		display: flex;
		align-items: center;
	}

	.bd-header,
	.bd-card-head,
	.bd-list-row,
	.bd-tabbar {
		justify-content: space-between;
	}

	.bd-eyebrow,
	.bd-title,
	.bd-subtitle,
	.bd-section-title,
	.bd-section-link,
	.bd-list-title,
	.bd-list-meta,
	.bd-amount,
	.bd-tab-label {
		display: block;
	}

	.bd-eyebrow {
		font-size: 22rpx;
		font-weight: 600;
		letter-spacing: 3rpx;
		color: #1f4e6e;
	}

	.bd-title {
		margin-top: 8rpx;
		font-size: 44rpx;
		font-weight: 800;
		color: #0d2839;
	}

	.bd-subtitle {
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: #4a5764;
	}

	.bd-avatar,
	.bd-shell,
	.bd-icon,
	.bd-tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bd-avatar {
		width: 78rpx;
		height: 78rpx;
		padding: 6rpx;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #f0d5d8, #b59ec2 48%, #7fb9a6);
		box-shadow: 0 8rpx 26rpx rgba(20, 58, 85, 0.12);
		box-sizing: border-box;
	}

	.bd-avatar::after {
		content: '';
		width: 100%;
		height: 100%;
		border-radius: 999rpx;
		background: radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.2) 70%);
	}

	.bd-shell {
		position: relative;
		width: 88rpx;
		height: 88rpx;
		border-radius: 52% 52% 46% 46%;
		background: linear-gradient(135deg, #f8d9dc, #e8b4bc 38%, #b59ec2 72%, #7fb9a6);
		box-shadow: 0 18rpx 34rpx rgba(201, 123, 134, 0.24);
		overflow: hidden;
	}

	.bd-shell::after {
		content: '';
		position: absolute;
		inset: 12rpx;
		border-radius: 999rpx;
		background: radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.12) 72%);
	}

	.bd-section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 34rpx 0 18rpx;
	}

	.bd-section-title {
		font-size: 30rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.bd-section-link {
		font-size: 23rpx;
		color: #7e8896;
	}

	.bd-card,
	.bd-list {
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.76);
		box-shadow: 0 12rpx 34rpx rgba(20, 58, 85, 0.06);
		backdrop-filter: blur(18rpx);
	}

	.bd-card {
		padding: 28rpx;
	}

	.bd-list {
		padding: 8rpx 24rpx;
    background-color: #fff;
	}

	.bd-list-row {
		gap: 20rpx;
		padding: 22rpx 0;
		border-bottom: 1rpx solid rgba(20, 58, 85, 0.08);
	}

	.bd-list-row:last-child {
		border-bottom: 0;
	}

	.bd-icon {
		width: 68rpx;
		height: 68rpx;
		flex: 0 0 68rpx;
		border-radius: 22rpx;
		font-size: 22rpx;
		font-weight: 800;
	}

	.bd-list-main {
		flex: 1;
		min-width: 0;
	}

	.bd-list-title {
		font-size: 26rpx;
		font-weight: 700;
		color: #1a2530;
	}

	.bd-list-meta {
		margin-top: 5rpx;
		font-size: 21rpx;
		color: #7e8896;
	}

	.bd-list-action {
		flex: 0 0 auto;
		max-width: 180rpx;
		font-size: 23rpx;
		color: #7e8896;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bd-amount {
		font-size: 27rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.bd-amount.income {
		color: #4a8b79;
	}

	.tone-coral { background: #f8d7c8; color: #e07a5f; }
	.tone-ocean { background: #d5e8e8; color: #3b6e89; }
	.tone-murex { background: #ebddf0; color: #8a6b96; }
	.tone-foam { background: #d4ecdf; color: #4a8b79; }
	.tone-sand { background: #fbe5c8; color: #b89570; }
	.tone-pink { background: #efced5; color: #c97b86; }
	.tone-rose { background: #f1c4cc; color: #b56774; }
	.tone-violet { background: #e0d7f0; color: #7555a4; }
	.tone-sky { background: #d6eaf4; color: #327aa3; }
	.tone-teal { background: #cfebe6; color: #258078; }
	.tone-olive { background: #e2e8c5; color: #6f7d3a; }
	.tone-cyan { background: #d2edf1; color: #1f8695; }
	.tone-amber { background: #f5dfbd; color: #ba7d2f; }
	.tone-lime { background: #dcecc2; color: #6f9232; }
	.tone-blue { background: #d4e1e8; color: #1f4e6e; }
	.tone-gold { background: #f3e4b8; color: #b98925; }
	.tone-indigo { background: #d9def2; color: #5261a3; }
	.tone-plum { background: #ead7eb; color: #8b5790; }
	.tone-mint { background: #d6eddf; color: #3f916f; }
	.tone-peach { background: #f8d4c9; color: #d16d57; }
	.tone-lavender { background: #e4dcf1; color: #8d76b4; }
	.tone-slate { background: #dde3e8; color: #607080; }

	.bd-progress {
		margin-top: 14rpx;
		height: 14rpx;
		border-radius: 999rpx;
		background: #f4efe3;
		overflow: hidden;
	}

	.bd-progress-fill {
		height: 100%;
		border-radius: 999rpx;
	}

	.bd-tabbar {
		position: fixed;
		left: 24rpx;
		right: 24rpx;
		bottom: calc(24rpx + var(--app-safe-bottom, env(safe-area-inset-bottom)));
		z-index: 30;
		padding: 16rpx 22rpx 20rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 34rpx;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 14rpx 42rpx rgba(13, 40, 57, 0.14);
		backdrop-filter: blur(22rpx);
	}

	.bd-tab {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 4rpx;
		color: #7e8896;
	}

	.bd-tab.active {
		color: #143a55;
	}

	.bd-tab-icon {
		width: 44rpx;
		height: 44rpx;
		border-radius: 18rpx;
		font-size: 22rpx;
		font-weight: 800;
	}

	.bd-tab-label {
		font-size: 19rpx;
	}

	@media screen and (min-width: 768px) {
		.bd-page {
			max-width: 430px;
			margin: 0 auto;
			box-shadow: 0 24px 70px rgba(13, 40, 57, 0.16);
		}

		.bd-tabbar {
			left: 50%;
			right: auto;
			bottom: calc(28px + var(--app-safe-bottom, env(safe-area-inset-bottom)));
			width: 382px;
			transform: translateX(-50%);
		}
	}
</style>
