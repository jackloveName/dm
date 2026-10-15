<template>
	<view class="bd-page home-page" :class="themeClass" :style="pageHeightStyle">
		<page-top
			eyebrow="PAYDAY RHYTHM"
			:title="pageGreeting"
			subtitle="以发薪日为起点，安排这一周期的收支节奏。"
			:show-avatar="true"
		/>

		<view class="balance-card">
			<view class="bd-card-head balance-head">
				<text>{{ currentMonthTitle }}</text>
				<text class="trend-pill">{{ trendText }}</text>
			</view>
			<view v-if="isCompactAmount(balanceTotal)" class="balance-number" :class="{ negative: balanceTotal < 0 }">
				<text v-if="balanceTotal < 0" class="balance-sign">-</text>
				<text class="currency">¥</text>{{ formatAmount(Math.abs(balanceTotal)) }}
			</view>
			<view v-else class="balance-number" :class="{ negative: balanceTotal < 0 }">
				<text v-if="balanceTotal < 0" class="balance-sign">-</text>
				<text class="currency">¥</text>{{ balanceInteger }}<text class="decimal">.{{ balanceDecimal }}</text>
			</view>
			<view class="balance-stats">
				<view>
					<text class="stat-label">收入</text>
					<text class="stat-value income">¥{{ formatAmount(incomeTotal) }}</text>
				</view>
				<view>
					<text class="stat-label">支出</text>
					<text class="stat-value expense">¥{{ formatAmount(expenseTotal) }}</text>
				</view>
			</view>
			<view class="payday-card" @tap="openPaydayBudget">
				<view class="payday-card-head">
					<view class="payday-card-title">
            <text class="payday-card-countdown">
              距发薪日还有 <text>{{ paydaySummary.remainingDays }}</text> 天
              <text class="payday-card-date">({{ paydaySummary.label }})</text>
            </text>
					</view>
					<text class="payday-card-action">{{ paydaySummary.configured ? '查看' : '设置' }} ›</text>
				</view>
			</view>
		</view>

		<view class="feature-grid">
			<view class="feature-card shell-feature-card" @tap="openFeature('/pages/shell/index')">
				<view class="feature-card-icon tone-cyan">
					<image src="/static/images/icon_shell.png" mode="aspectFit"></image>
				</view>
				<text class="feature-card-name">记录成长</text>
				<text class="feature-card-desc">{{ shellSummary.levelText }}</text>
				<text class="feature-card-meta">{{ shellSummary.meta }}</text>
			</view>
			<view class="feature-card aa-feature-card" @tap="openFeature('/pages/aa/index')">
				<view class="feature-card-icon tone-violet">
					<image src="/static/images/icon_aa.png" mode="aspectFit"></image>
				</view>
				<text class="feature-card-name">共同分账</text>
				<text class="feature-card-desc">{{ aaSummary.description }}</text>
				<text class="feature-card-meta">{{ aaSummary.meta }}</text>
			</view>
			<view class="feature-card subscription-feature-card" @tap="openFeature('/pages/subscriptions/index')">
				<view class="feature-card-icon tone-indigo">
					<image src="/static/images/icon_subscribe.png" mode="aspectFit"></image>
				</view>
				<text class="feature-card-name">自动扣费</text>
				<text class="feature-card-desc">{{ subscriptionSummary.description }}</text>
				<text class="feature-card-meta">{{ subscriptionSummary.meta }}</text>
			</view>
		</view>

		<item-header title="本月流水" link-text="查看" link-url="/pages/bill/index" />

		<rushing-water-list :transactions="displayTransactions" :show-full-date-time="true" />

		<view v-if="showPaydayPrompt" class="payday-prompt-mask" @tap="closePaydayPrompt" @touchmove.stop.prevent>
			<view class="payday-prompt-panel" @tap.stop @touchmove.stop>
				<view class="payday-prompt-mark"><text>¥</text></view>
				<text class="payday-prompt-title">今日是发薪日哦！</text>
				<text class="payday-prompt-copy">是否去记一笔？</text>
				<view class="payday-prompt-actions">
					<view class="payday-prompt-button cancel" @tap="closePaydayPrompt">取消</view>
					<view class="payday-prompt-button confirm" @tap="goToPaydayRecord">去记录</view>
				</view>
			</view>
		</view>

		<view v-if="showLowBalanceDialog" class="low-balance-mask" @tap="closeLowBalanceDialog" @touchmove.stop.prevent>
			<view class="low-balance-panel" @tap.stop @touchmove.stop>
				<view class="low-balance-mark">
					<text>!</text>
				</view>
				<text class="low-balance-title">{{ lowBalanceDialogTitle }}</text>
				<text class="low-balance-copy">{{ lowBalanceDialogCopy }}</text>
				<view class="low-balance-button" @tap="closeLowBalanceDialog">我知道了</view>
			</view>
		</view>

		<app-update ref="appUpdate" />
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import AppUpdate from '@/components/AppUpdate/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import RushingWaterList from '@/components/rushingWaterList/index.vue'
	import { getStoredPhone, getUserConfig, loadBillData, readJsonConfig, toBillItem } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount, formatAmountWithFixedDecimals } from '@/common/format.js'
	import { getBillsByMonth, getCurrentMonth, getMonthlyTrends, getRecordStreak, getTotalByType } from '@/common/insights.js'
	import { DEFAULT_PAYDAY_BUDGET, getPaydayBudgetSummary, getPaydayPromptStorageKey, normalizePaydayBudget } from '@/common/paydayBudget.js'
	import { buildBadgeMetrics, buildBadges } from '@/common/badge.js'
	import { AA_SPLIT_STORAGE_KEY, getAaOngoingRecords, normalizeAaRecords } from '@/common/aaSplit.js'
	import { getSubscriptionMonthlyAmount, normalizeSubscriptions, SUBSCRIPTION_STORAGE_KEY } from '@/common/subscription.js'
	import { getShellExperience, getShellLevelInfo } from '@/common/shellLevel.js'

	const PAYDAY_BUDGET_STORAGE_KEY = 'paydayBudgetSettings'

	export default {
		components: {
			PageTop,
			ItemHeader,
			RushingWaterList,
			AppUpdate
		},
		data() {
			return {
				pageGreeting: '',
				currentMonthTitle: '',
				remoteTransactions: [],
				aaRecords: [],
				subscriptions: [],
				nickname: uni.getStorageSync('profileNickname') || '用户',
				paydaySettings: normalizePaydayBudget(uni.getStorageSync(PAYDAY_BUDGET_STORAGE_KEY) || DEFAULT_PAYDAY_BUDGET),
				showPaydayPrompt: false,
				paydayPromptCycleKey: '',
				showLowBalanceDialog: false,
				lowBalanceDialogTitle: '能量提醒',
				lowBalanceDialogCopy: ''
			}
		},
		computed: {
			displayTransactions() {
				return this.currentMonthTransactions.slice(0, 6)
			},
			incomeTotal() {
				return getTotalByType(this.currentMonthTransactions, 'in')
			},
			expenseTotal() {
				return getTotalByType(this.currentMonthTransactions, 'out')
			},
			currentMonthTransactions() {
				return getBillsByMonth(this.remoteTransactions, getCurrentMonth())
			},
			balanceTotal() {
				return Number((this.incomeTotal - this.expenseTotal).toFixed(2))
			},
			balanceInteger() {
				return this.formatAmount(Math.abs(this.balanceTotal)).split('.')[0]
			},
			balanceDecimal() {
				return this.formatAmount(Math.abs(this.balanceTotal)).split('.')[1] || '00'
			},
			trendText() {
				const trends = getMonthlyTrends(this.remoteTransactions, 2)
				const currentExpense = trends[1] ? trends[1].value : 0
				const previousExpense = trends[0] ? trends[0].value : 0
				if (!previousExpense || !currentExpense) return '暂无可比数据'

				const percent = Math.round(((currentExpense - previousExpense) / previousExpense) * 100)
				if (!percent) return '与上月持平'
				return percent > 0 ? `较上月 +${percent}%` : `较上月 ${percent}%`
			},
			paydaySummary() {
				return getPaydayBudgetSummary(this.remoteTransactions, this.paydaySettings)
			},
			shellBadges() {
				return this.badges.filter((item) => item.unlocked).slice(0, 3).length
					? this.badges.filter((item) => item.unlocked).slice(0, 3)
					: this.badges.slice(0, 3)
			},
			badges() {
				return buildBadges(buildBadgeMetrics(this.remoteTransactions))
			},
			shellSummary() {
				const streak = getRecordStreak(this.remoteTransactions)
				const experience = getShellExperience(this.remoteTransactions.length, streak)
				const levelInfo = getShellLevelInfo(experience)
				return {
					levelText: `Lv.${levelInfo.level} ${levelInfo.name}`,
					meta: streak ? `连续记账 ${streak} 天` : '记下今天第一笔 →',
					xp: experience,
					xpTarget: levelInfo.nextRequiredExperience,
					xpPercent: levelInfo.progressPercent,
					level: levelInfo.level
				}
			},
			aaSummary() {
				const ongoing = getAaOngoingRecords(this.aaRecords)
				const first = ongoing[0]
				return first
					? {
						description: `${first.name} ¥${this.formatAmount(first.totalAmount)}`,
						meta: `进行中 ${ongoing.length} 笔 →`
					}
					: { description: '记录聚餐、房租等共同支出', meta: '新建一笔 →' }
			},
			subscriptionSummary() {
				const monthly = this.subscriptions.reduce((sum, item) => sum + getSubscriptionMonthlyAmount(item), 0)
				return this.subscriptions.length
					? { description: `${this.subscriptions.length} 项 · 月均 ¥${formatAmountWithFixedDecimals(monthly)}`, meta: '查看扣费安排 →' }
					: { description: '记录自动扣费订阅', meta: '添加第一项 →' }
			}
		},
		onShow() {
			this.$nextTick(() => this.$refs.appUpdate && this.$refs.appUpdate.checkAppUpdate())
			this.updatePageGreeting()
			this.updateCurrentMonthTitle()
			this.loadBills()
		},
		methods: {
			isCompactAmount(value) {
				return Math.abs(Number(value || 0)) > 10000000
			},
			formatAmount(value) {
				return formatDisplayAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			},
			async loadBills() {
				const [bills] = await Promise.all([loadBillData(), this.loadPaydaySettings()])
				this.remoteTransactions = bills.map(toBillItem)
				this.loadFeatureData()
				this.checkLowBalanceAfterLogin()
				if (!this.showLowBalanceDialog) this.checkPaydayPrompt()
			},
			loadFeatureData() {
				this.aaRecords = normalizeAaRecords(uni.getStorageSync(AA_SPLIT_STORAGE_KEY))
				this.subscriptions = normalizeSubscriptions(uni.getStorageSync(SUBSCRIPTION_STORAGE_KEY))
			},
			async loadPaydaySettings() {
				this.paydaySettings = normalizePaydayBudget(uni.getStorageSync(PAYDAY_BUDGET_STORAGE_KEY) || DEFAULT_PAYDAY_BUDGET)
				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const remoteConfig = await getUserConfig(`${phone}PaydayBudget`)
					const remoteSettings = readJsonConfig(remoteConfig, {})
					this.paydaySettings = normalizePaydayBudget(remoteSettings)
					uni.setStorageSync(PAYDAY_BUDGET_STORAGE_KEY, this.paydaySettings)
				} catch (error) {
					// Keep locally saved settings when remote data is unavailable.
				}
			},
			checkLowBalanceAfterLogin() {
				const shouldCheck = uni.getStorageSync('checkLowBalanceAfterLogin')
				if (!shouldCheck) return

				uni.removeStorageSync('checkLowBalanceAfterLogin')
				if (!this.remoteTransactions.length) return
				const prompt = this.getLowBalancePrompt()
				if (!prompt) return

				const month = getCurrentMonth()
				const phone = getStoredPhone() || 'default-user'
				const promptKey = `lowBalancePromptV2:${phone}:${month}`
				if (uni.getStorageSync(promptKey)) return

				uni.setStorageSync(promptKey, true)
				this.lowBalanceDialogTitle = prompt.title
				this.lowBalanceDialogCopy = prompt.copy
				this.showLowBalanceDialog = true
			},
			getLowBalancePrompt() {
				const balance = Number(this.balanceTotal.toFixed(2))
				if (balance > 0 && balance < 1000) {
					return {
						title: '能量提醒',
						copy: '本月能量不多了，请小心使用！'
					}
				}
				if (balance === 0) {
					return {
						title: '能量提醒',
						copy: '啊哦！本月能量已经用完了！'
					}
				}
				if (balance < 0) {
					return {
						title: '能量提醒',
						copy: 'STOP！本月能量已透支，请停止你的小手！'
					}
				}
				return null
			},
			closeLowBalanceDialog() {
				this.showLowBalanceDialog = false
			},
			getTodayDateKey() {
				const date = new Date()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${date.getFullYear()}-${month}-${day}`
			},
			checkPaydayPrompt() {
				const summary = this.paydaySummary
				if (!summary.configured || summary.startText !== this.getTodayDateKey()) return

				const account = getStoredPhone() || 'default-user'
				const storageKey = getPaydayPromptStorageKey(account, summary.startText)
				if (uni.getStorageSync(storageKey)) return

				this.paydayPromptCycleKey = summary.startText
				this.showPaydayPrompt = true
			},
			closePaydayPrompt() {
				if (this.paydayPromptCycleKey) {
					const account = getStoredPhone() || 'default-user'
					uni.setStorageSync(getPaydayPromptStorageKey(account, this.paydayPromptCycleKey), true)
				}
				this.showPaydayPrompt = false
				this.paydayPromptCycleKey = ''
			},
			goToPaydayRecord() {
				this.showPaydayPrompt = false
				const cycleKey = encodeURIComponent(this.paydayPromptCycleKey)
				uni.navigateTo({
					url: `/pages/addOne/index?paydayPrompt=1&recordType=income&categoryValue=14&paydayCycleKey=${cycleKey}`,
					fail: () => uni.showToast({ title: '页面暂不可用', icon: 'none' })
				})
			},
			openPaydayBudget() {
				uni.navigateTo({
					url: '/pages/paydayBudget/index',
					fail: () => uni.showToast({ title: '页面暂不可用', icon: 'none' })
				})
			},
			getBeijingDate() {
				const now = new Date()
				const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
				return new Date(utcTime + 8 * 60 * 60000)
			},
			getBeijingHour() {
				return this.getBeijingDate().getHours()
			},
			updateCurrentMonthTitle() {
				const date = this.getBeijingDate()
				this.currentMonthTitle = `${date.getFullYear()}年${date.getMonth() + 1}月结余`
			},
			updatePageGreeting() {
				const hour = this.getBeijingHour()

				if (hour >= 5 && hour < 11) {
					this.pageGreeting = `早安，${this.nickname}`
					return
				}

				if (hour >= 11 && hour < 14) {
					this.pageGreeting = `中午好，${this.nickname}`
					return
				}

				if (hour >= 14 && hour < 18) {
					this.pageGreeting = `下午好，${this.nickname}`
					return
				}

				if (hour >= 18 && hour < 23) {
					this.pageGreeting = `晚上好，${this.nickname}`
					return
				}

				this.pageGreeting = `夜深了，${this.nickname}`
			},
			openFeature(url) {
				// #ifdef H5
				if (typeof window !== 'undefined') {
					uni.navigateTo({
						url,
						fail: () => {
							window.location.hash = url
						}
					})
					return
				}
				// #endif

				uni.navigateTo({
					url,
					fail: () => uni.showToast({ title: '页面暂不可用', icon: 'none' })
				})
			}
		}
	}
</script>

<style>
	.stat-label,
	.stat-value,
	.trend-pill {
		display: block;
	}

	.balance-card {
		position: relative;
		margin-top: 34rpx;
		padding: 36rpx 34rpx 34rpx;
		border-radius: 42rpx;
		color: #fbf8f2;
		background: linear-gradient(135deg, #143a55 0%, #2c556f 100%);
		box-shadow: 0 26rpx 60rpx rgba(13, 40, 57, 0.24);
		overflow: hidden;
	}

	.balance-card::before,
	.balance-card::after {
		content: '';
		position: absolute;
		border-radius: 999rpx;
		pointer-events: none;
	}

	.balance-card::before {
		top: -72rpx;
		right: -46rpx;
		width: 260rpx;
		height: 260rpx;
		background: radial-gradient(circle, rgba(232, 180, 188, 0.28), transparent 66%);
	}

	.balance-card::after {
		left: -56rpx;
		bottom: -96rpx;
		width: 230rpx;
		height: 230rpx;
		background: radial-gradient(circle, rgba(127, 185, 166, 0.22), transparent 64%);
	}

	.balance-head,
	.balance-number,
	.trend-pill,
	.balance-stats {
		position: relative;
		z-index: 1;
	}

	.balance-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18rpx;
		font-size: 22rpx;
		letter-spacing: 3rpx;
		color: rgba(251, 248, 242, 0.66);
	}

	.balance-head > text:first-child {
		flex: 1;
		min-width: 0;
	}

	.balance-number {
		margin-top: 22rpx;
		font-size: 76rpx;
		font-weight: 800;
		line-height: 1;
	}

	.balance-number.negative {
		color: #ff8b78;
		text-shadow: 0 0 26rpx rgba(255, 92, 70, 0.48);
	}

	.balance-sign {
		margin-right: 6rpx;
		font-size: 58rpx;
		font-weight: 800;
		line-height: 1;
	}

	.currency {
		margin-right: 6rpx;
		font-size: 34rpx;
		font-weight: 500;
		opacity: 0.82;
	}

	.decimal {
		font-size: 42rpx;
		opacity: 0.72;
	}

	.balance-number.negative .currency,
	.balance-number.negative .decimal {
		opacity: 1;
	}

	.trend-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0;
		padding: 8rpx 18rpx;
		border-radius: 999rpx;
		background: rgba(191, 224, 210, 0.14);
		color: #bfe0d2;
		font-size: 22rpx;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0;
	}

	.balance-stats {
		display: flex;
		gap: 30rpx;
		margin-top: 30rpx;
		padding-top: 26rpx;
		border-top: 1rpx solid rgba(251, 248, 242, 0.12);
	}

	.balance-stats > view {
		flex: 1;
	}

	.balance-stats > view + view {
		padding-left: 30rpx;
		border-left: 1rpx solid rgba(251, 248, 242, 0.12);
	}

	.stat-label {
		font-size: 21rpx;
		color: rgba(251, 248, 242, 0.58);
	}

	.stat-value {
		margin-top: 8rpx;
		font-size: 30rpx;
		font-weight: 800;
	}

	.stat-value.income { color: #bfe0d2; }
	.stat-value.expense { color: #f0a48e; }

	.payday-card {
		position: relative;
		margin: 28rpx 0 0;
		padding: 24rpx 0 0;
		border-top: 1rpx solid rgba(251, 248, 242, 0.14);
		color: #fbf8f2;
		box-sizing: border-box;
}

	.payday-card-head,
	.payday-card-title,
	.home-payday-countdown {
		position: relative;
		z-index: 1;
	}

	.payday-card-head,
	.payday-card-title {
		display: flex;
		align-items: center;
	}

	.payday-card-head {
		justify-content: space-between;
		gap: 18rpx;
	}

	.payday-card-title {
		min-width: 0;
		gap: 12rpx;
		font-size: 23rpx;
		font-weight: 700;
		color: rgba(251, 248, 242, 0.78);
	}

	.payday-card-title > text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.payday-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48rpx;
		height: 48rpx;
		flex: 0 0 48rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.14);
		color: #bfe0d2;
		font-size: 25rpx;
		font-weight: 800;
	}

  .payday-card-countdown {
    font-size: 28rpx;
  }
  .payday-card-countdown > text {
		font-weight: 800;
  }
  .payday-card-date {
    font-size: 20rpx;
  }

	.payday-card-action {
		flex: 0 0 auto;
		font-size: 23rpx;
		color: #bfe0d2;
	}

	.home-payday-countdown {
		display: block;
		margin-top: 24rpx;
		font-size: 38rpx;
		font-weight: 800;
		line-height: 1.25;
	}

	.home-payday-countdown > text {
		font-size: 54rpx;
		color: #bfe0d2;
	}

	.home-payday-countdown-empty {
		font-size: 31rpx;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12rpx;
		margin-top: 28rpx;
	}

	.feature-card {
		min-width: 0;
		min-height: 246rpx;
		padding: 18rpx 14rpx 16rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.84);
		box-shadow: 0 12rpx 30rpx rgba(20, 58, 85, 0.06);
		box-sizing: border-box;
	}

	.feature-card:active { transform: scale(0.98); }

	.feature-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 58rpx;
		height: 58rpx;
		margin-bottom: 14rpx;
		border-radius: 18rpx;
	}

	.feature-card-icon image {
		width: 38rpx;
		height: 38rpx;
	}

	.feature-card-name,
	.feature-card-desc,
	.feature-card-meta {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.feature-card-name {
		font-size: 25rpx;
		font-weight: 800;
		color: #1a2530;
		white-space: nowrap;
	}

	.feature-card-desc {
		height: 62rpx;
		margin-top: 8rpx;
		font-size: 20rpx;
		line-height: 1.55;
		color: #7e8896;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.feature-card-meta {
		margin-top: 8rpx;
		font-size: 20rpx;
		font-weight: 700;
		color: #4a8b79;
		white-space: nowrap;
	}

	.feature-badges {
		display: flex;
		gap: 6rpx;
		margin-top: 12rpx;
	}

	.feature-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32rpx;
		height: 32rpx;
		border-radius: 999rpx;
	}

	.feature-badge image {
		width: 24rpx;
		height: 24rpx;
	}

	.payday-prompt-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 125;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 44rpx;
		background: rgba(13, 40, 57, 0.38);
		box-sizing: border-box;
	}

	.payday-prompt-panel {
		width: 100%;
		max-width: 560rpx;
		padding: 46rpx 36rpx 32rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		text-align: center;
		box-sizing: border-box;
	}

	.payday-prompt-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 82rpx;
		height: 82rpx;
		margin: 0 auto 24rpx;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #143a55 0%, #2c556f 58%, #7fb9a6 100%);
		color: #fffdf8;
		font-size: 40rpx;
		font-weight: 800;
	}

	.payday-prompt-title,
	.payday-prompt-copy {
		display: block;
	}

	.payday-prompt-title {
		font-size: 33rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.payday-prompt-copy {
		margin-top: 14rpx;
		font-size: 25rpx;
		line-height: 1.7;
		color: #7e8896;
	}

	.payday-prompt-actions {
		display: flex;
		gap: 14rpx;
		margin-top: 30rpx;
	}

	.payday-prompt-button {
		flex: 1;
		height: 76rpx;
		border-radius: 18rpx;
		font-size: 26rpx;
		font-weight: 700;
		line-height: 76rpx;
		text-align: center;
		box-sizing: border-box;
	}

	.payday-prompt-button.cancel {
		border: 1rpx solid rgba(20, 58, 85, 0.1);
		background: #f1eadf;
		color: #52606c;
	}

	.payday-prompt-button.confirm {
		background: #143a55;
		box-shadow: 0 14rpx 30rpx rgba(20, 58, 85, 0.18);
		color: #fff;
	}

	.low-balance-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 120;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 44rpx;
		background: rgba(13, 40, 57, 0.38);
		box-sizing: border-box;
	}

	.low-balance-panel {
		width: 100%;
		max-width: 560rpx;
		padding: 46rpx 36rpx 32rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		text-align: center;
		box-sizing: border-box;
	}

	.low-balance-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 82rpx;
		height: 82rpx;
		margin: 0 auto 24rpx;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #f0d5d8 0%, #b59ec2 58%, #7fb9a6 100%);
		color: #fffdf8;
		font-size: 40rpx;
		font-weight: 800;
	}

	.low-balance-title,
	.low-balance-copy {
		display: block;
	}

	.low-balance-title {
		font-size: 33rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.low-balance-copy {
		margin-top: 14rpx;
		font-size: 25rpx;
		line-height: 1.7;
		color: #7e8896;
	}

	.low-balance-button {
		height: 76rpx;
		margin-top: 30rpx;
		border-radius: 18rpx;
		background: #143a55;
		font-size: 26rpx;
		font-weight: 700;
		line-height: 76rpx;
		color: #fff;
	}
</style>
