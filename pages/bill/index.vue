<template>
	<view class="bd-page all-rushing-page" :class="themeClass" :style="pageHeightStyle">
		<view class="page-nav">
			<go-back inline fallback-url="/pages/home/index" />
			<text class="page-title">{{ pageTitle }}</text>
			<time-picker v-model="selectedMonth" format="YYYY-MM" :max-date="getTodayDate()" />
		</view>

		<view class="overview-card">
			<view class="overview-main">
				<text class="overview-label">{{ overviewMonthText }} · 共 {{ monthTransactions.length }} 笔</text>
				<text class="overview-value">¥{{ formatAmount(expenseTotal) }}</text>
			</view>
			<view class="overview-balance">
				<text class="balance-label">结余</text>
				<text class="balance-value">{{ balancePrefix }}¥{{ formatAmount(Math.abs(balanceTotal)) }}</text>
			</view>
		</view>

		<view v-if="!displayGroups.length" class="empty-data">
			<text>暂无数据</text>
		</view>

		<view v-for="(item,index) in displayGroups" :key="index" class="transaction-group">
			<item-header :title="item.date" :link-text="item.list.length + ' 笔'" />
			<rushing-water-list
				:transactions="item.list"
				:editable="true"
				:deleting-transaction-id="deletingTransactionId"
				@transactionTap="openTransactionEditor"
				@delete="deleteTransaction"
			/>
		</view>

		<view v-if="showEditor" class="bill-editor-mask" @tap="closeTransactionEditor" @touchmove.stop.prevent>
			<view class="bill-editor-panel" @tap.stop @touchmove.stop>
				<text class="editor-title">编辑账单</text>
				<view class="editor-record-summary">
					<view class="editor-record-icon" :class="editingCategory.tone">
						<image v-if="editingCategory.iconPath" :src="editingCategory.iconPath" mode="aspectFit"></image>
					</view>
					<view class="editor-record-copy">
						<text class="editor-record-category">{{ editingCategory.name || '未分类' }}</text>
						<text class="editor-record-type">{{ editingType }}</text>
					</view>
				</view>

				<view class="editor-field">
					<text class="editor-label">金额</text>
					<view class="editor-money-input">
						<text>¥</text>
						<input
							v-model="editingAmount"
							class="editor-input"
							type="digit"
							maxlength="12"
							placeholder="请输入金额"
						/>
					</view>
				</view>

				<view class="editor-field">
					<text class="editor-label">时间</text>
					<view class="editor-date-wrap">
						<time-picker
							v-model="editingRecordAt"
							format="YYYY-MM-DD HH:mm"
							variant="record"
							placeholder="请选择"
							:show-arrow="true"
							:max-date="getTodayDate()"
						/>
					</view>
				</view>

				<view class="editor-field">
					<text class="editor-label">备注</text>
					<input v-model="editingRemark" class="editor-input editor-remark-input" maxlength="20" placeholder="输入备注" />
				</view>

				<view class="editor-actions">
					<view class="editor-button cancel" @tap="closeTransactionEditor">取消</view>
					<view class="editor-button confirm" @tap="saveTransaction">保存</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import ItemHeader from '@/components/itemHeader/index.vue'
	import RushingWaterList from '@/components/rushingWaterList/index.vue'
	import TimePicker from '@/components/timePicker/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { billCategories, getBillCategoryByName, getBillCategoryByValue } from '@/common/categories.js'
	import { getStoredPhone, groupBillsByDate, loadBillData, saveUserConfig, toBillItem } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'
	import { getBillsByMonth, getCurrentMonth, getTotalByType } from '@/common/insights.js'

	export default {
		components: {
			ItemHeader,
			RushingWaterList,
			TimePicker,
			GoBack
		},
		data() {
			return {
				selectedMonth: getCurrentMonth(),
				categoryFilter: '',
				billRecords: [],
				remoteTransactions: [],
				showEditor: false,
				editingIndex: -1,
				editingAmount: '',
				editingType: '支出',
				editingCategory: { ...billCategories[0] },
				editingRecordAt: '',
				editingRemark: '',
				deletingTransactionId: '',
				saving: false
			}
		},
		computed: {
			allTransactions() {
				return this.remoteTransactions
			},
			monthTransactions() {
				const selectedMonth = this.normalizeMonthValue(this.selectedMonth)
				const monthTransactions = selectedMonth ? getBillsByMonth(this.allTransactions, selectedMonth) : this.allTransactions
				return monthTransactions.filter((item) => {
					const matchesCategory = !this.categoryFilter || item.category === this.categoryFilter
					return matchesCategory
				})
			},
			displayGroups() {
				return groupBillsByDate(this.monthTransactions)
			},
			incomeTotal() {
				return this.getTotalByType('in')
			},
			expenseTotal() {
				return this.getTotalByType('out')
			},
			balanceTotal() {
				return Number((this.incomeTotal - this.expenseTotal).toFixed(2))
			},
			balancePrefix() {
				return this.balanceTotal >= 0 ? '+' : '-'
			},
			overviewMonthText() {
				const monthText = this.getMonthText(this.normalizeMonthValue(this.selectedMonth)) || '全部'
				return this.categoryFilter ? `${monthText} · ${this.categoryFilter}` : monthText
			},
			pageTitle() {
				return this.categoryFilter ? `${this.categoryFilter}账单` : '总账单'
			}
		},
		onLoad(options = {}) {
			this.categoryFilter = options.category ? decodeURIComponent(options.category) : ''
			const month = this.normalizeMonthValue(options.month)
			if (month) this.selectedMonth = month
		},
		onShow() {
			this.loadBills()
		},
		methods: {
			formatAmount(value) {
				return formatDisplayAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			},
			normalizeMonthValue(value) {
				if (typeof value === 'string') {
					const match = value.match(/\d{4}-\d{1,2}/)
					if (!match) return ''
					const [year, month] = match[0].split('-')
					return `${year}-${String(month).padStart(2, '0')}`
				}
				if (value && typeof value === 'object') {
					if (typeof value.value === 'string') return this.normalizeMonthValue(value.value)
					if (value.detail && typeof value.detail.value === 'string') return this.normalizeMonthValue(value.detail.value)
				}
				return ''
			},
			getTodayDate() {
				const date = new Date()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${date.getFullYear()}-${month}-${day}`
			},
			getTotalByType(type) {
				return getTotalByType(this.monthTransactions, type)
			},
			async loadBills() {
				const bills = await loadBillData()
				const source = Array.isArray(bills) ? bills : []
				this.billRecords = source.map((item, index) => ({
					...(item && typeof item === 'object' ? item : {}),
					id: item && (item.id || item.recordId || item.billId) ? (item.id || item.recordId || item.billId) : `bill_${Date.now()}_${index}`
				}))
				this.remoteTransactions = this.billRecords.map((item, index) => toBillItem(item, index))
			},
			padDate(value) {
				return String(value).padStart(2, '0')
			},
			normalizeEditDate(value) {
				const text = String(value || '').trim()
				const match = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?(?:[ T](\d{1,2})[:：](\d{2}))?/) 
				if (!match) return this.getCurrentDateTimeValue()

				return `${match[1]}-${this.padDate(match[2])}-${this.padDate(match[3])} ${this.padDate(match[4] || 0)}:${match[5] || '00'}`
			},
			getCurrentDateTimeValue() {
				const date = new Date()
				return `${date.getFullYear()}-${this.padDate(date.getMonth() + 1)}-${this.padDate(date.getDate())} ${this.padDate(date.getHours())}:${this.padDate(date.getMinutes())}`
			},
			getRecordCategory(record, displayItem) {
				const rawCategory = record && record.category && typeof record.category === 'object'
					? (record.category.name || record.category.value)
					: (record && (record.category || record.categoryValue || record.categoryId))
				const category = getBillCategoryByName(rawCategory) || getBillCategoryByValue(rawCategory) || getBillCategoryByName(displayItem && displayItem.category)
				return category || { ...billCategories[0] }
			},
			getRecordType(record, displayItem) {
				const type = record && record.tradeType !== undefined ? record.tradeType : record && record.type
				if (type === '收入' || type === 'in' || type === 2 || type === '2') return '收入'
				return displayItem && displayItem.type === 'in' ? '收入' : '支出'
			},
			getRecordAmount(record, displayItem) {
				const rawAmount = record && record.money !== undefined
					? record.money
					: record && record.amount !== undefined
						? record.amount
						: displayItem && displayItem.money
				const normalized = String(rawAmount === undefined || rawAmount === null ? '' : rawAmount).replace(/[^\d.-]/g, '')
				const amount = Number(normalized)
				return Number.isFinite(amount) ? String(Math.abs(amount)) : ''
			},
			openTransactionEditor(item) {
				if (!item || this.saving) return
				const index = this.billRecords.findIndex((record) => String(record.id) === String(item.id))
				if (index < 0) return

				const record = this.billRecords[index]
				this.editingIndex = index
				this.editingAmount = this.getRecordAmount(record, item)
				this.editingType = this.getRecordType(record, item)
				this.editingCategory = this.getRecordCategory(record, item)
				this.editingRecordAt = this.normalizeEditDate(record.fullDate || record.date || record.time || item.fullDate || item.time)
				this.editingRemark = String(record.remark || (record.name && record.name !== item.category ? record.name : '') || '')
				this.showEditor = true
			},
			closeTransactionEditor() {
				if (this.saving) return
				this.showEditor = false
				this.editingIndex = -1
				this.editingAmount = ''
				this.editingType = '支出'
				this.editingCategory = { ...billCategories[0] }
				this.editingRecordAt = ''
				this.editingRemark = ''
			},
			normalizeRecordDate(value) {
				const text = String(value || '').trim()
				return text.length === 16 ? `${text}:00` : text
			},
			async persistBills(nextBills) {
				uni.setStorageSync('mock_bill_data', nextBills)
				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					await saveUserConfig(`${phone}BillMoney`, JSON.stringify(nextBills), '哆米记账账单数据')
				}
			},
			async saveTransaction() {
				if (this.saving || this.editingIndex < 0) return
				const amount = Number(String(this.editingAmount || '').trim())
				if (!Number.isFinite(amount) || amount <= 0) {
					uni.showToast({ title: '请输入正确金额', icon: 'none' })
					return
				}
				const nextBills = this.billRecords.map((record, index) => {
					if (index !== this.editingIndex) return record
					const recordDate = this.normalizeRecordDate(this.editingRecordAt || this.getCurrentDateTimeValue())
					return {
						...record,
						date: recordDate,
						fullDate: recordDate,
						money: Number(amount.toFixed(2)),
						remark: String(this.editingRemark || '').trim()
					}
				})

				this.closeTransactionEditor()
				this.saving = true
				this.billRecords = nextBills
				this.remoteTransactions = nextBills.map((item, index) => toBillItem(item, index))
				try {
					await this.persistBills(nextBills)
					uni.showToast({ title: '账单已更新', icon: 'success' })
				} catch (error) {
					// uni.showToast({ title: '账单已本地保存', icon: 'none' })
				} finally {
					this.saving = false
				}
			},
			async deleteTransaction(item) {
				if (this.saving || !item) return
				const nextBills = this.billRecords.filter((record) => String(record.id) !== String(item.id))
				if (nextBills.length === this.billRecords.length) return

				this.deletingTransactionId = String(item.id)
				this.saving = true
				this.billRecords = nextBills
				this.remoteTransactions = nextBills.map((record, index) => toBillItem(record, index))
				try {
					await this.persistBills(nextBills)
					uni.showToast({ title: '账单已删除', icon: 'success' })
				} catch (error) {
					// uni.showToast({ title: '账单已本地删除', icon: 'none' })
				} finally {
					this.deletingTransactionId = ''
					this.saving = false
				}
			},
			getMonthText(value) {
				if (!value) return ''
				const [year, month] = value.split('-')
				if (!year || !month) return ''
				return `${Number(month)}月`
			}
		}
	}
</script>

<style>
	.all-rushing-page {
		padding-top: calc(34rpx + var(--app-safe-top, env(safe-area-inset-top)));
	}

	.page-nav {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.page-title {
		position: absolute;
		left: 50%;
		top: 50%;
		font-size: 34rpx;
		font-weight: 800;
		color: #0d2839;
		transform: translate(-50%, -50%);
	}

	.overview-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		margin-top: 34rpx;
		min-height: 176rpx;
		padding: 28rpx 42rpx;
		border-radius: 42rpx;
		background: linear-gradient(105deg, #bfe3d5 0%, #d6ddd8 52%, #efd4d7 100%);
		box-shadow: 0 16rpx 36rpx rgba(20, 58, 85, 0.08);
		box-sizing: border-box;
		color: #0d2839;
	}

	.overview-label,
	.overview-value,
	.balance-label,
	.balance-value {
		display: block;
	}

	.overview-label {
		font-size: 27rpx;
		font-weight: 700;
		color: #3b6e89;
	}

	.overview-value {
		margin-top: 24rpx;
		font-size: 60rpx;
		font-weight: 800;
		line-height: 1;
		color: #0d2839;
	}

	.overview-balance {
		text-align: right;
	}

	.balance-label {
		font-size: 26rpx;
		font-weight: 700;
		color: #7e8896;
	}

	.balance-value {
		margin-top: 22rpx;
		font-size: 34rpx;
		font-weight: 800;
		line-height: 1;
		color: #0d2839;
	}

	.empty-data {
		margin-top: 28rpx;
		padding: 64rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		font-size: 24rpx;
		text-align: center;
		color: #9aa2ab;
	}

	.bill-editor-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
		display: flex;
		align-items: flex-end;
		padding: 24rpx 24rpx calc(24rpx + var(--app-safe-bottom, env(safe-area-inset-bottom)));
		background: rgba(13, 40, 57, 0.38);
		box-sizing: border-box;
	}

	.bill-editor-panel {
		width: 100%;
		max-height: calc(var(--app-window-height, 100vh) - 48rpx);
		padding: 34rpx 28rpx 26rpx;
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		box-sizing: border-box;
		overflow-y: auto;
	}

	.editor-title,
	.editor-label {
		display: block;
	}

	.editor-title {
		font-size: 32rpx;
		font-weight: 800;
		color: #143a55;
	}

	.editor-record-summary {
		display: flex;
		align-items: center;
		gap: 14rpx;
		margin-top: 22rpx;
		padding: 16rpx 18rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 18rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.editor-record-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 58rpx;
		height: 58rpx;
		flex: 0 0 58rpx;
		border-radius: 18rpx;
	}

	.editor-record-icon image {
		width: 34rpx;
		height: 34rpx;
	}

	.editor-record-copy {
		flex: 1;
		min-width: 0;
	}

	.editor-record-category,
	.editor-record-type {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.editor-record-category {
		font-size: 25rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.editor-record-type {
		margin-top: 4rpx;
		font-size: 20rpx;
		color: #7e8896;
	}

	.editor-field {
		min-width: 0;
		margin-top: 22rpx;
	}

	.editor-label {
		margin-bottom: 9rpx;
		font-size: 22rpx;
		font-weight: 700;
		color: #52606c;
	}

	.editor-money-input,
	.editor-input,
	.editor-date-wrap {
		width: 100%;
		height: 76rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 16rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.editor-money-input {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 0 20rpx;
	}

	.editor-money-input > text {
		font-size: 28rpx;
		font-weight: 800;
		color: #143a55;
	}

	.editor-input {
		padding: 0 18rpx;
		font-size: 25rpx;
		color: #1a2530;
	}

	.editor-money-input .editor-input {
		flex: 1;
		min-width: 0;
		height: 72rpx;
		padding: 0;
		border: 0;
		background: transparent;
	}

	.editor-date-wrap {
		display: flex;
		align-items: center;
		padding: 0 18rpx;
	}

	.editor-date-wrap .time-picker {
		flex: 1;
		justify-content: flex-end;
		min-width: 0;
		height: 68rpx;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		font-size: 24rpx;
		font-weight: 800;
		color: #143a55;
	}

	.editor-actions {
		display: flex;
		gap: 14rpx;
		margin-top: 28rpx;
	}

	.editor-button {
		flex: 1;
		height: 76rpx;
		border-radius: 16rpx;
		font-size: 26rpx;
		font-weight: 700;
		line-height: 76rpx;
		text-align: center;
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
