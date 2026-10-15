<template>
	<view class="bd-page budget-page" :class="themeClass" :style="pageHeightStyle">
		<go-back />

		<page-top
			eyebrow="MONTHLY BUDGET"
			title="月度预算"
			subtitle="给每一类支出设定边界，让日常更从容。"
		/>

		<view class="budget-toolbar">
			<view class="budget-toolbar-copy">
				<text class="budget-toolbar-label">本月预算</text>
				<!-- <text class="budget-toolbar-label">{{ selectedMonthText }}预算</text> -->
			</view>
			<time-picker
				v-model="selectedMonth"
				format="YYYY-MM"
				variant="filter"
				@change="handleMonthChange"
			/>
		</view>

		<view class="budget-summary">
			<view class="summary-top">
				<text class="summary-label">总额度</text>
				<text class="summary-value">¥{{ formatAmount(totalBudget) }}</text>
			</view>
			<view class="summary-used-card">
				<text class="summary-label">已用额度</text>
				<text class="summary-value used">¥{{ formatAmount(totalUsed) }}</text>
				<view class="summary-progress">
					<view class="summary-progress-fill" :style="{ width: usedPercent + '%' }"></view>
				</view>
			</view>
			<view class="summary-bottom">
				<text class="summary-label">剩余额度</text>
				<text class="summary-value remain">¥{{ formatAmount(remainingBudget) }}</text>
			</view>
		</view>

		<item-header title="预算分类" />

		<view class="budget-list">
			<view
				v-for="item in budgets"
				:key="item.name"
				class="budget-row"
				@tap="openBudgetEditor(item)"
			>
				<view class="budget-row-left">
					<view class="budget-icon" :class="item.tone">
						<image :src="item.iconPath" mode="aspectFit"></image>
					</view>
					<view class="budget-name-wrap">
						<text class="budget-name">{{ item.name }}</text>
					</view>
				</view>
				<view class="budget-row-right">
					<text class="budget-amount" :class="{ unset: !item.amount }">
						{{ item.amount ? `¥${formatAmount(item.amount)}` : '未设置' }}
					</text>
					<text class="budget-edit-icon" aria-label="编辑">✎</text>
				</view>
			</view>
		</view>

		<!-- <view v-if="!totalBudget" class="empty-data">
			<text>暂无数据</text>
		</view> -->

		<view v-if="showBudgetEditor" class="budget-editor-mask" @tap="closeBudgetEditor" @touchmove.stop.prevent>
			<view class="budget-editor-panel" @tap.stop @touchmove.stop>
				<text class="editor-title">编辑{{ editingBudget.name }}预算</text>
				<text class="editor-subtitle">设置 {{ selectedMonthText }} 的支出上限</text>
				<view class="editor-input-wrap">
					<text class="editor-currency">¥</text>
					<input
						v-model="editingAmount"
						class="editor-input"
						type="digit"
						maxlength="10"
						placeholder="请输入预算金额"
						confirm-type="done"
						@confirm="saveBudget"
					/>
				</view>
				<text class="editor-tip">金额可填写到小数点后两位</text>
				<view class="editor-actions">
					<view class="editor-button cancel" @tap="closeBudgetEditor">取消</view>
					<view class="editor-button confirm" @tap="saveBudget">保存</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import TimePicker from '@/components/timePicker/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { billCategories } from '@/common/categories.js'
	import { getStoredPhone, getUserConfig, loadBillData, readJsonConfig, saveUserConfig, toBillItem } from '@/api/index.js'
	import { getBillsByMonth } from '@/common/insights.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	function pad(value) {
		return String(value).padStart(2, '0')
	}

	function getCurrentMonth() {
		const date = new Date()
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
	}

	function normalizeMonthValue(value) {
		if (typeof value === 'string') {
			const match = value.match(/\d{4}-\d{1,2}/)
			if (!match) return ''

			const [year, month] = match[0].split('-')
			return `${year}-${pad(month)}`
		}

		if (value && typeof value === 'object') {
			if (typeof value.value === 'string') return normalizeMonthValue(value.value)
			if (value.detail && typeof value.detail.value === 'string') return normalizeMonthValue(value.detail.value)
		}

		return ''
	}

	function getBudgetCategories() {
		return billCategories.filter((item) => item.type !== '2')
	}

	export default {
		components: {
			PageTop,
			ItemHeader,
			TimePicker,
			GoBack
		},
		data() {
			const selectedMonth = getCurrentMonth()
			const savedBudgets = uni.getStorageSync('monthlyBudgets') || {}

			return {
				selectedMonth,
				budgetStorage: savedBudgets,
				transactions: [],
				showBudgetEditor: false,
				editingBudget: {},
				editingAmount: ''
			}
		},
		onShow() {
			this.loadBudgets()
			this.loadBills()
		},
		computed: {
			normalizedSelectedMonth() {
				return normalizeMonthValue(this.selectedMonth) || getCurrentMonth()
			},
			selectedMonthText() {
				const [year, month] = this.normalizedSelectedMonth.split('-')
				return `${year}年${Number(month)}月`
			},
			budgets() {
				return this.createBudgetList(this.normalizedSelectedMonth, this.budgetStorage[this.normalizedSelectedMonth])
			},
			totalBudget() {
				return this.budgets.reduce((total, item) => total + Number(item.amount || 0), 0)
			},
			totalUsed() {
				return this.budgets.reduce((total, item) => total + Number(item.usedAmount || 0), 0)
			},
			remainingBudget() {
				return Math.max(this.totalBudget - this.totalUsed, 0)
			},
			usedPercent() {
				if (!this.totalBudget) return 0
				return Math.min(Math.round((this.totalUsed / this.totalBudget) * 100), 100)
			}
		},
		methods: {
			createBudgetList(month, monthBudgets) {
				const values = monthBudgets || {}
				const usedByCategory = {}
				getBillsByMonth(this.transactions, month).forEach((item) => {
					if (item.type !== 'out') return
					usedByCategory[item.category] = (usedByCategory[item.category] || 0) + Number(item.money || 0)
				})

				return getBudgetCategories().map((category) => ({
					...category,
					amount: Number(values[category.name] || 0),
					usedAmount: Number(usedByCategory[category.name] || 0)
				}))
			},
			async loadBills() {
				const bills = await loadBillData()
				this.transactions = bills.map(toBillItem)
			},
			async loadBudgets() {
				this.budgetStorage = uni.getStorageSync('monthlyBudgets') || {}

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const budgetConfig = await getUserConfig(`${phone}MonthlyBudgets`)
					const remoteBudgets = readJsonConfig(budgetConfig, {})
					if (remoteBudgets && typeof remoteBudgets === 'object' && !Array.isArray(remoteBudgets)) {
						this.budgetStorage = remoteBudgets
						uni.setStorageSync('monthlyBudgets', remoteBudgets)
					}
				} catch (error) {
					// Keep locally saved budgets when remote data is unavailable.
				}
			},
			formatAmount(value) {
				return formatDisplayAmount(value)
			},
			handleMonthChange(value) {
				const nextMonth = normalizeMonthValue(value)
				if (!nextMonth) return
				this.selectedMonth = nextMonth
			},
			openBudgetEditor(item) {
				this.editingBudget = { ...item }
				this.editingAmount = item.amount === 0 ? '' : String(item.amount)
				this.showBudgetEditor = true
			},
			closeBudgetEditor() {
				this.showBudgetEditor = false
				this.editingBudget = {}
				this.editingAmount = ''
			},
			async saveBudget() {
				const rawAmount = String(this.editingAmount || '').trim()
				const amount = Number(rawAmount)

				if (!rawAmount || !Number.isFinite(amount) || amount < 0) {
					uni.showToast({ title: '请输入正确的预算金额', icon: 'none' })
					return
				}

				const nextBudgets = this.budgets.map((item) => {
					if (item.name !== this.editingBudget.name) return item
					return { ...item, amount }
				})
				const monthBudgets = nextBudgets.reduce((result, item) => {
					result[item.name] = item.amount
					return result
				}, {})

				this.budgetStorage = { ...this.budgetStorage, [this.normalizedSelectedMonth]: monthBudgets }
				uni.setStorageSync('monthlyBudgets', this.budgetStorage)
				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					try {
						await saveUserConfig(`${phone}MonthlyBudgets`, JSON.stringify(this.budgetStorage), '哆米记账月度预算')
					} catch (error) {
						uni.showToast({ title: '预算已本地保存', icon: 'none' })
					}
				}
				this.closeBudgetEditor()
				uni.showToast({ title: '预算已保存', icon: 'success' })
			}
		}
	}
</script>

<style>
	.budget-page {
		padding-bottom: 90rpx;
	}

	.budget-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		margin-top: 34rpx;
	}

	.budget-toolbar-copy {
		flex: 1;
		min-width: 0;
	}

	.budget-toolbar-label,
	.budget-toolbar-subtitle {
		display: block;
	}

	.budget-toolbar-label {
		font-size: 30rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.budget-toolbar-subtitle {
		margin-top: 7rpx;
		font-size: 22rpx;
		color: #7e8896;
	}

	.budget-summary {
		display: flex;
		flex-direction: column;
		gap: 22rpx;
		margin-top: 24rpx;
		padding: 30rpx 34rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #bfe3d5 0%, #d9e2dc 56%, #f0d5d8 100%);
		box-shadow: 0 16rpx 36rpx rgba(20, 58, 85, 0.08);
		box-sizing: border-box;
	}

	.summary-top,
	.summary-used-card,
	.summary-bottom {
		min-width: 0;
		box-sizing: border-box;
	}

	.summary-used-card {
		padding: 24rpx 26rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 26rpx;
		background: rgba(255, 255, 255, 0.52);
		box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.52);
	}

	.summary-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		padding-top: 2rpx;
	}

	.summary-label,
	.summary-value,
	.summary-progress,
	.summary-progress-fill {
		display: block;
	}

	.summary-label {
		font-size: 22rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: #3b6e89;
	}

	.summary-value {
		margin-top: 10rpx;
		font-size: 52rpx;
		font-weight: 800;
		line-height: 1;
		color: #0d2839;
		word-break: break-all;
	}

	.summary-value.used {
		font-size: 44rpx;
		color: #c97b86;
	}

	.summary-value.remain {
		margin-top: 0;
		flex-shrink: 0;
		font-size: 34rpx;
		color: #4a8b79;
	}

	.summary-progress {
		margin-top: 20rpx;
		height: 12rpx;
		border-radius: 999rpx;
		background: rgba(20, 58, 85, 0.1);
		overflow: hidden;
	}

	.summary-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #e07a5f 0%, #c97b86 100%);
	}

	.budget-list {
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 12rpx 34rpx rgba(20, 58, 85, 0.06);
		box-sizing: border-box;
		overflow: hidden;
	}

	.budget-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		min-height: 112rpx;
		padding: 20rpx 24rpx;
		border-bottom: 1rpx solid rgba(20, 58, 85, 0.08);
		box-sizing: border-box;
	}

	.budget-row:last-child {
		border-bottom: 0;
	}

	.empty-data {
		margin-top: 18rpx;
		padding: 64rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		font-size: 24rpx;
		text-align: center;
		color: #9aa2ab;
	}

	.budget-row-left,
	.budget-row-right {
		display: flex;
		align-items: center;
	}

	.budget-row-left {
		gap: 18rpx;
		flex: 1;
		min-width: 0;
	}

	.budget-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 68rpx;
		height: 68rpx;
		flex: 0 0 68rpx;
		border-radius: 22rpx;
	}

	.budget-icon image {
		width: 38rpx;
		height: 38rpx;
	}

	.budget-name-wrap {
		min-width: 0;
	}

	.budget-name,
	.budget-hint,
	.budget-amount {
		display: block;
	}

	.budget-name {
		font-size: 27rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.budget-hint {
		margin-top: 6rpx;
		font-size: 21rpx;
		color: #9aa2ab;
	}

	.budget-row-right {
		gap: 18rpx;
		flex-shrink: 0;
	}

	.budget-amount {
		min-width: 126rpx;
		font-size: 27rpx;
		font-weight: 800;
		color: #143a55;
		text-align: right;
	}

	.budget-amount.unset {
		font-size: 24rpx;
		font-weight: 600;
		color: #a0a8af;
	}

	.budget-edit-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48rpx;
		height: 48rpx;
		border-radius: 16rpx;
		background: #f7f2e8;
		font-size: 28rpx;
		line-height: 1;
		color: #7e8896;
	}

	.budget-editor-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
		background: rgba(13, 40, 57, 0.38);
		box-sizing: border-box;
	}

	.budget-editor-panel {
		width: 100%;
		max-width: 620rpx;
		padding: 42rpx 36rpx 30rpx;
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		box-sizing: border-box;
	}

	.editor-title,
	.editor-subtitle,
	.editor-tip {
		display: block;
	}

	.editor-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.editor-subtitle {
		margin-top: 12rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: #7e8896;
	}

	.editor-input-wrap {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 28rpx;
		padding: 0 22rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 18rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.editor-currency {
		font-size: 30rpx;
		font-weight: 800;
		color: #143a55;
	}

	.editor-input-wrap > .editor-input {
		flex: 1;
		min-width: 0;
		height: 88rpx;
		font-size: 30rpx;
		font-weight: 700;
		color: #1a2530;
    border: 0;
	}

	.editor-tip {
		margin-top: 10rpx;
		font-size: 21rpx;
		color: #9aa2ab;
	}

	.editor-actions {
		display: flex;
		gap: 18rpx;
		margin-top: 28rpx;
	}

	.editor-button {
		flex: 1;
		height: 76rpx;
		line-height: 76rpx;
		border-radius: 18rpx;
		text-align: center;
		font-size: 27rpx;
		font-weight: 700;
	}

	.editor-button.cancel {
		background: #f1eee7;
		color: #66727c;
	}

	.editor-button.confirm {
		background: #143a55;
		color: #fff;
	}
</style>
