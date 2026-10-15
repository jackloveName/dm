<template>
	<view class="bd-page payday-page" :class="themeClass" :style="pageHeightStyle">
		<go-back />

		<page-top
			eyebrow="PAYDAY BUDGET"
			title="发薪日周期预算"
			subtitle="跟着发薪日安排每一笔自由支出。"
		/>

		<view class="payday-hero">
			<view class="payday-hero-head">
				<view class="payday-hero-label">
					<text>本期预算 · {{ summary.label }}</text>
				</view>
			</view>

			<text v-if="summary.configured" class="payday-countdown">
				距离发薪还有 <text>{{ summary.remainingDays }}</text> 天
			</text>
			<text v-else class="payday-countdown payday-countdown-empty">先设置月薪，开始管理周期预算</text>
			<text class="payday-hero-copy">
				{{ summary.configured ? `自由预算 ¥${formatCompact(summary.freeBudget)} · 已支出 ¥${formatCompact(summary.spent)}` : '预算周期会自动避开发薪日之外的自然月统计' }}
			</text>
			<view class="payday-progress">
				<view class="payday-progress-fill" :style="{ width: summary.spendingPercent + '%' }"></view>
			</view>
			<view class="payday-stats">
				<view class="payday-stat">
					<text class="payday-stat-label">剩余可用</text>
					<text class="payday-stat-value" :class="{ danger: summary.isOverBudget }">¥{{ formatCompact(summary.remainingBudget) }}</text>
				</view>
				<view class="payday-stat">
					<text class="payday-stat-label">日均可用</text>
					<text class="payday-stat-value">¥{{ formatCompact(summary.dailyBudget) }}</text>
				</view>
				<view class="payday-stat">
					<text class="payday-stat-label">固定预留</text>
					<text class="payday-stat-value">¥{{ formatCompact(summary.fixedTotal) }}</text>
				</view>
			</view>
		</view>

		<item-header title="预算设置" />
		<view class="setting-panel" id="payday-settings">
			<view class="setting-row">
				<view class="setting-copy">
					<text class="setting-label">发薪日</text>
					<text class="setting-desc">每个周期从发薪日开始计算</text>
				</view>
				<picker class="setting-picker-control" mode="selector" :range="paydayLabels" :value="paydayIndex" @change="handlePaydayChange">
					<view class="setting-picker-value">
						<text>{{ paydayLabels[paydayIndex] }}</text>
						<view class="picker-arrow"></view>
					</view>
				</picker>
			</view>
			<view class="setting-row">
				<view class="setting-copy">
					<text class="setting-label">月薪（税后）</text>
					<text class="setting-desc">用于计算本期自由预算</text>
				</view>
				<view class="salary-input-wrap">
					<text class="salary-prefix">¥</text>
					<input v-model="settings.salary" class="salary-input" type="digit" maxlength="12" placeholder="未设置" @input="handleSalaryInput" />
				</view>
			</view>
			<text class="setting-hint">固定支出会先从月薪中预留，剩下的金额才是本周期可以自由安排的额度。</text>
		</view>

		<item-header title="固定支出预留">
			<template #action>
				<text class="section-total">合计 ¥{{ formatCompact(summary.fixedTotal) }}</text>
			</template>
		</item-header>
		<view class="fixed-panel">
			<view v-if="settings.fixedExpenses.length" class="fixed-list">
				<view v-for="(item, index) in settings.fixedExpenses" :key="item.id" class="fixed-row">
					<view class="fixed-icon" :class="getFixedTone(item.name)">
						<image v-if="getFixedCategory(item.name)" :src="getFixedCategory(item.name).iconPath" mode="aspectFit"></image>
						<text v-else>¥</text>
					</view>
					<text class="fixed-name">{{ item.name }}</text>
					<view class="fixed-amount-wrap">
						<text class="fixed-prefix">¥</text>
						<input v-model="item.amount" class="fixed-amount" type="digit" maxlength="10" @input="handleFixedAmountInput($event, index)" />
					</view>
					<view class="fixed-delete" @tap="removeFixedExpense(index)"><text>×</text></view>
				</view>
			</view>
			<view v-else class="fixed-empty">还没有固定支出，添加后会自动从月薪中预留。</view>
			<view class="fixed-add-row">
				<picker class="fixed-type-picker-control" mode="selector" :range="fixedExpenseOptions" :value="newFixedTypeIndex" @change="handleNewFixedTypeChange">
					<view class="fixed-type-picker">
						<text class="fixed-type-label">{{ fixedExpenseOptions[newFixedTypeIndex] }}</text>
						<view class="picker-arrow"></view>
					</view>
				</picker>
				<view class="new-fixed-input-wrap">
					<text>¥</text>
					<input v-model="newFixedAmount" class="new-fixed-input" type="digit" maxlength="10" placeholder="金额" />
				</view>
				<view class="add-fixed-button" @tap="addFixedExpense">添加</view>
			</view>
		</view>

		<item-header title="本期执行" />
		<view class="execution-card">
			<view class="execution-row">
				<text>本期自由预算</text>
				<text>¥{{ formatCompact(summary.freeBudget) }}</text>
			</view>
			<view class="execution-row">
				<text>已支出</text>
				<text class="used">¥{{ formatCompact(summary.spent) }}</text>
			</view>
			<view class="execution-divider"></view>
			<view class="execution-row execution-highlight">
				<text>剩余可用</text>
				<text :class="{ danger: summary.isOverBudget }">¥{{ formatCompact(summary.remainingBudget) }}</text>
			</view>
			<view class="execution-progress-head">
				<text>本期进度 {{ summary.spendingPercent }}%</text>
				<text>已过 {{ summary.elapsedDays }} 天 / 共 {{ summary.totalDays }} 天</text>
			</view>
			<view class="execution-progress">
				<view class="execution-progress-fill" :class="{ danger: summary.isOverBudget }" :style="{ width: summary.spendingPercent + '%' }"></view>
			</view>
			<view class="execution-tip" :class="{ warning: summary.isOverBudget || (summary.freeBudget > 0 && summary.remainingBudget / summary.freeBudget < 0.2) }">
				{{ executionTip }}
			</view>
		</view>

		<view class="save-settings-button" @tap="saveSettings">保存设置</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { getBillCategoryByName } from '@/common/categories.js'
	import { getStoredPhone, getUserConfig, loadBillData, readJsonConfig, saveUserConfig, toBillItem } from '@/api/index.js'
	import {
		DEFAULT_PAYDAY_BUDGET,
		FIXED_EXPENSE_OPTIONS,
		PAYDAY_OPTIONS,
		getPaydayBudgetSummary,
		getPaydayLabel,
		normalizePaydayBudget
	} from '@/common/paydayBudget.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	const STORAGE_KEY = 'paydayBudgetSettings'

	export default {
		components: {
			PageTop,
			ItemHeader,
			GoBack
		},
		data() {
			const savedSettings = normalizePaydayBudget(uni.getStorageSync(STORAGE_KEY) || DEFAULT_PAYDAY_BUDGET)
			return {
				settings: savedSettings,
				transactions: [],
				paydayOptions: PAYDAY_OPTIONS,
				fixedExpenseOptions: FIXED_EXPENSE_OPTIONS,
				newFixedTypeIndex: 0,
				newFixedAmount: '',
				saving: false
			}
		},
		computed: {
			paydayLabels() {
				return this.paydayOptions.map((item) => getPaydayLabel(item))
			},
			paydayIndex() {
				const index = this.paydayOptions.findIndex((item) => String(item) === String(this.settings.payday))
				return index > -1 ? index : 0
			},
			summary() {
				return getPaydayBudgetSummary(this.transactions, this.settings)
			},
			executionTip() {
				if (!this.summary.configured) return '设置月薪后，这里会显示本期自由预算的执行情况。'
				if (this.summary.isOverBudget) return '本期自由预算已用尽，建议先暂停非必要支出。'
				if (this.summary.freeBudget > 0 && this.summary.remainingBudget / this.summary.freeBudget < 0.2) return '剩余预算不足 20%，接下来可以适当放慢消费节奏。'
				return '固定支出先预留，自由预算就是本周期可以安心安排的额度。'
			}
		},
		onShow() {
			this.loadSettings()
			this.loadBills()
		},
		methods: {
			formatCompact(value) {
				return formatDisplayAmount(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
			},
			getFixedCategory(name) {
				return getBillCategoryByName(name) || null
			},
			getFixedTone(name) {
				const category = this.getFixedCategory(name)
				return category ? category.tone : 'tone-blue'
			},
			handlePaydayChange(event) {
				const index = Number(event.detail && event.detail.value)
				if (!Number.isInteger(index) || !this.paydayOptions[index]) return
				this.settings.payday = this.paydayOptions[index]
			},
			handleSalaryInput(event) {
				const value = event && event.detail ? event.detail.value : this.settings.salary
				this.settings.salary = String(value || '').replace(/[^\d.]/g, '')
			},
			handleFixedAmountInput(event, index) {
				const value = event && event.detail ? event.detail.value : ''
				if (this.settings.fixedExpenses[index]) this.settings.fixedExpenses[index].amount = String(value || '').replace(/[^\d.]/g, '')
			},
			handleNewFixedTypeChange(event) {
				const index = Number(event.detail && event.detail.value)
				if (Number.isInteger(index) && this.fixedExpenseOptions[index]) this.newFixedTypeIndex = index
			},
			addFixedExpense() {
				const amount = Number(this.newFixedAmount)
				if (!Number.isFinite(amount) || amount <= 0) {
					uni.showToast({ title: '请输入有效金额', icon: 'none' })
					return
				}

				this.settings.fixedExpenses.push({
					id: `fixed-${Date.now()}`,
					name: this.fixedExpenseOptions[this.newFixedTypeIndex],
					amount
				})
				this.newFixedAmount = ''
			},
			removeFixedExpense(index) {
				this.settings.fixedExpenses.splice(index, 1)
			},
			async loadBills() {
				const bills = await loadBillData()
				this.transactions = bills.map(toBillItem)
			},
			async loadSettings() {
				this.settings = normalizePaydayBudget(uni.getStorageSync(STORAGE_KEY) || DEFAULT_PAYDAY_BUDGET)
				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const remoteConfig = await getUserConfig(`${phone}PaydayBudget`)
					const remoteSettings = readJsonConfig(remoteConfig, {})
					this.settings = normalizePaydayBudget(remoteSettings)
					uni.setStorageSync(STORAGE_KEY, this.settings)
				} catch (error) {
					// Keep locally saved settings when remote data is unavailable.
				}
			},
			async saveSettings() {
				if (this.saving) return

				const settings = normalizePaydayBudget(this.settings)
				if (!settings.salary) {
					uni.showToast({ title: '请先填写月薪', icon: 'none' })
					return
				}

				this.settings = settings
				uni.setStorageSync(STORAGE_KEY, settings)
				this.saving = true
				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					try {
						await saveUserConfig(`${phone}PaydayBudget`, JSON.stringify(settings), '哆米记账发薪日周期预算')
					} catch (error) {
						uni.showToast({ title: '已保存到本地', icon: 'none' })
					}
				}
				this.saving = false
				uni.showToast({ title: '预算设置已保存', icon: 'success' })
				setTimeout(() => {
					uni.navigateBack({
						delta: 1,
						fail: () => uni.switchTab({ url: '/pages/home/index' })
					})
				}, 500)
			}
		}
	}
</script>

<style>
	.payday-page {
		padding-bottom: 112rpx;
	}

	.payday-hero {
		position: relative;
		margin-top: 34rpx;
		padding: 30rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #143a55 0%, #2c556f 100%);
		box-shadow: 0 20rpx 46rpx rgba(13, 40, 57, 0.2);
		color: #fbf8f2;
		overflow: hidden;
	}

	.payday-hero::before,
	.payday-hero::after {
		content: '';
		position: absolute;
		border-radius: 999rpx;
		pointer-events: none;
	}

	.payday-hero::before {
		top: -92rpx;
		right: -68rpx;
		width: 250rpx;
		height: 250rpx;
		background: radial-gradient(circle, rgba(232, 180, 188, 0.32), transparent 68%);
	}

	.payday-hero::after {
		left: -72rpx;
		bottom: -110rpx;
		width: 250rpx;
		height: 250rpx;
		background: radial-gradient(circle, rgba(127, 185, 166, 0.24), transparent 68%);
	}

	.payday-hero-head,
	.payday-countdown,
	.payday-hero-copy,
	.payday-progress,
	.payday-stats {
		position: relative;
		z-index: 1;
	}

	.payday-hero-head,
	.payday-hero-label,
	.payday-stats {
		display: flex;
		align-items: center;
	}

	.payday-hero-head {
		justify-content: space-between;
		gap: 18rpx;
	}

	.payday-hero-label {
		min-width: 0;
		gap: 12rpx;
		font-size: 23rpx;
		font-weight: 700;
		color: rgba(251, 248, 242, 0.78);
	}

	.payday-hero-label > text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.payday-wallet-icon {
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

	.payday-hero-action {
		flex: 0 0 auto;
		font-size: 23rpx;
		color: #bfe0d2;
	}

	.payday-countdown {
		display: block;
		margin-top: 28rpx;
		font-size: 42rpx;
		font-weight: 800;
		line-height: 1.25;
	}

	.payday-countdown > text {
		font-size: 58rpx;
		color: #bfe0d2;
	}

	.payday-countdown-empty {
		font-size: 34rpx;
	}

	.payday-hero-copy {
		display: block;
		margin-top: 10rpx;
		font-size: 23rpx;
		color: rgba(251, 248, 242, 0.62);
	}

	.payday-progress {
		height: 12rpx;
		margin-top: 28rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.16);
		overflow: hidden;
	}

	.payday-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: #bfe0d2;
		transition: width 0.25s ease;
	}

	.payday-stats {
		gap: 12rpx;
		margin-top: 20rpx;
	}

	.payday-stat {
		min-width: 0;
		flex: 1;
		padding: 16rpx 14rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.12);
		box-sizing: border-box;
	}

	.payday-stat-label,
	.payday-stat-value {
		display: block;
	}

	.payday-stat-label {
		font-size: 20rpx;
		color: rgba(251, 248, 242, 0.56);
	}

	.payday-stat-value {
		margin-top: 8rpx;
		font-size: 27rpx;
		font-weight: 800;
		color: #fbf8f2;
		word-break: break-all;
	}

	.payday-stat-value.danger,
	.execution-row .danger {
		color: #ffb3a4;
	}

	.setting-panel,
	.fixed-panel,
	.execution-card {
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 12rpx 34rpx rgba(20, 58, 85, 0.06);
		box-sizing: border-box;
	}

	.setting-panel {
		padding: 8rpx 28rpx 24rpx;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		min-height: 104rpx;
		border-bottom: 1rpx solid rgba(20, 58, 85, 0.08);
	}

	.setting-row:last-of-type {
		border-bottom: 0;
	}

	.setting-copy {
		flex: 1;
		min-width: 0;
	}

	.setting-label,
	.setting-desc,
	.setting-hint {
		display: block;
	}

	.setting-label {
		font-size: 27rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.setting-desc {
		margin-top: 6rpx;
		font-size: 21rpx;
		color: #9aa2ab;
	}

	.setting-picker-value {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14rpx;
		width: 220rpx;
		height: 68rpx;
		padding: 0 18rpx 0 22rpx;
		border-radius: 16rpx;
		background: #f7f2e8;
		box-sizing: border-box;
		font-size: 25rpx;
		font-weight: 700;
		color: #143a55;
	}

	.setting-picker-control {
		display: block;
		flex: 0 0 220rpx;
		width: 220rpx;
	}

	.setting-picker-value > text:first-child {
		display: block;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.picker-arrow {
		width: 12rpx;
		height: 12rpx;
		flex: 0 0 auto;
		border-right: 3rpx solid #9aa2ab;
		border-bottom: 3rpx solid #9aa2ab;
		box-sizing: border-box;
		transform: rotate(45deg) translate(-2rpx, -2rpx);
	}

	.salary-input-wrap,
	.fixed-amount-wrap,
	.new-fixed-input-wrap {
		display: flex;
		align-items: center;
	}

	.salary-input-wrap {
		width: 220rpx;
		padding: 0 18rpx;
		border-radius: 16rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.salary-prefix,
	.fixed-prefix,
	.new-fixed-input-wrap > text {
		font-size: 25rpx;
		font-weight: 800;
		color: #143a55;
	}

	.salary-input {
		width: 100%;
		height: 68rpx;
		padding-left: 8rpx;
		font-size: 26rpx;
		font-weight: 700;
		text-align: right;
		color: #143a55;
	}

	.setting-hint {
		padding-top: 20rpx;
		font-size: 21rpx;
		line-height: 1.6;
		color: #7e8896;
	}

	.section-total {
		font-size: 22rpx;
		font-weight: 700;
		color: #7e8896;
	}

	.fixed-panel {
		padding: 8rpx 28rpx 24rpx;
	}

	.fixed-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		min-height: 96rpx;
		border-bottom: 1rpx dashed rgba(20, 58, 85, 0.1);
	}

	.fixed-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56rpx;
		height: 56rpx;
		flex: 0 0 56rpx;
		border-radius: 18rpx;
		font-size: 23rpx;
		font-weight: 800;
	}

	.fixed-icon image {
		width: 34rpx;
		height: 34rpx;
	}

	.fixed-name {
		flex: 1;
		min-width: 0;
		font-size: 25rpx;
		font-weight: 700;
		color: #1a2530;
	}

	.fixed-amount-wrap {
		width: 154rpx;
		justify-content: flex-end;
	}

	.fixed-amount {
		width: 124rpx;
		height: 62rpx;
		font-size: 25rpx;
		font-weight: 700;
		text-align: right;
		color: #143a55;
	}

	.fixed-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48rpx;
		height: 48rpx;
		flex: 0 0 48rpx;
		border-radius: 16rpx;
		background: #f8e5e3;
		color: #c97b86;
	}

	.fixed-delete text {
		font-size: 34rpx;
		font-weight: 300;
		line-height: 1;
	}

	.fixed-empty {
		padding: 30rpx 0 24rpx;
		font-size: 23rpx;
		text-align: center;
		color: #9aa2ab;
	}

	.fixed-add-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding-top: 22rpx;
	}

	.fixed-type-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8rpx;
		width: 188rpx;
		height: 62rpx;
		padding: 0 12rpx 0 14rpx;
		border-radius: 16rpx;
		background: #f7f2e8;
		box-sizing: border-box;
		font-size: 23rpx;
		font-weight: 700;
		color: #52606c;
	}

	.fixed-type-picker-control {
		display: block;
		flex: 0 0 188rpx;
		width: 188rpx;
	}

	.fixed-type-label {
		display: block;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.new-fixed-input-wrap {
		flex: 1;
		min-width: 0;
		padding: 0 14rpx;
		border-radius: 16rpx;
		background: #f7f2e8;
	}

	.new-fixed-input {
		width: 100%;
		height: 62rpx;
		padding-left: 6rpx;
		font-size: 23rpx;
		font-weight: 700;
		text-align: right;
		color: #143a55;
	}

	.add-fixed-button,
	.save-settings-button {
		text-align: center;
		font-weight: 800;
	}

	.add-fixed-button {
		padding: 16rpx 20rpx;
		border-radius: 16rpx;
		background: #d9eee4;
		font-size: 23rpx;
		color: #4a8b79;
		white-space: nowrap;
	}

	.execution-card {
		padding: 24rpx 28rpx 28rpx;
	}

	.execution-row,
	.execution-progress-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18rpx;
	}

	.execution-row {
		padding: 13rpx 0;
		font-size: 25rpx;
		color: #7e8896;
	}

	.execution-row > text:last-child {
		font-weight: 800;
		color: #1a2530;
	}

	.execution-row .used {
		color: #c97b86;
	}

	.execution-divider {
		height: 1rpx;
		margin: 8rpx 0;
		background: rgba(20, 58, 85, 0.08);
	}

	.execution-highlight {
		margin: 4rpx -14rpx;
		padding: 18rpx 14rpx;
		border-radius: 18rpx;
		background: #eef6f1;
		color: #4a8b79;
		font-weight: 800;
	}

	.execution-highlight > text:last-child {
		font-size: 34rpx;
		color: #4a8b79;
	}

	.execution-progress-head {
		margin-top: 22rpx;
		font-size: 21rpx;
		font-weight: 700;
		color: #7e8896;
	}

	.execution-progress {
		height: 12rpx;
		margin-top: 12rpx;
		border-radius: 999rpx;
		background: #edf0ee;
		overflow: hidden;
	}

	.execution-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #7fb9a6 0%, #4a8b79 100%);
	}

	.execution-progress-fill.danger {
		background: linear-gradient(90deg, #e8a6b2 0%, #c97b86 100%);
	}

	.execution-tip {
		margin-top: 20rpx;
		padding: 16rpx 18rpx;
		border-radius: 16rpx;
		background: #eef6f1;
		font-size: 22rpx;
		line-height: 1.6;
		color: #4a8b79;
	}

	.execution-tip.warning {
		background: #fff2e5;
		color: #b89570;
	}

	.save-settings-button {
		height: 82rpx;
		margin-top: 28rpx;
		border-radius: 22rpx;
		background: #143a55;
		box-shadow: 0 14rpx 30rpx rgba(20, 58, 85, 0.18);
		font-size: 28rpx;
		line-height: 82rpx;
		color: #fff;
	}
</style>
