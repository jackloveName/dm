<template>
	<view class="add-page" :class="themeClass" :style="pageHeightStyle">
		<view class="nav-row">
			<text class="nav-title">记一笔</text>
		</view>

		<view class="amount-section">
			<view class="amount-value">
				<text class="currency">¥</text>
				<input
					class="amount-input"
					type="text"
					inputmode="decimal"
					v-model="amount"
					placeholder="0.00"
					maxlength="10"
					@input="handleAmountInput"
					@blur="validateAmount"
				/>
			</view>
		</view>

		<view class="type-tabs">
			<view v-for="item in recordTypes" :key="item" class="type-tab" :class="{ active: item === activeType }" @tap="selectRecordType(item)">
				<text>{{ item }}</text>
			</view>
		</view>

		<view class="category-grid">
			<view v-for="item in visibleCategories" :key="item.value" class="category-item" :class="{ active: item.value === selectedCategory.value }" @tap="selectCategory(item)">
				<view class="category-icon" :class="item.tone">
					<image v-if="item.iconPath" :src="item.iconPath" mode="aspectFit"></image>
					<text v-else>{{ item.name.slice(0, 1) }}</text>
				</view>
				<text class="category-name">{{ item.name }}</text>
			</view>
		</view>

		<view class="record-panel">
			<view class="record-row">
				<view>
					<text class="record-label">时间</text>
					<text class="record-desc">选择记账时间</text>
				</view>
				<time-picker v-model="recordAt" format="YYYY-MM-DD HH:mm" variant="record" placeholder="请选择" :show-arrow="true" :max-date="getTodayDate()" />
			</view>

			<view class="record-row remark-row">
				<view>
					<text class="record-label">备注</text>
					<text class="record-desc">补充账单说明</text>
				</view>
				<input class="remark-input" v-model="remark" placeholder="输入备注" maxlength="12" />
			</view>
		</view>

		<view class="bottom-actions">
			<view class="bottom-button cancel" @tap="closePage">取消</view>
			<view class="bottom-button confirm" @tap="saveRecord">保存</view>
		</view>
	</view>
</template>

<script>
	import { billCategories, getDefaultBillCategory, getBillCategoryByName, getBillCategoryByValue } from '@/common/categories.js'
	import TimePicker from '@/components/timePicker/index.vue'
	import { getStoredPhone, saveUserConfig } from '@/api/index.js'
	import { getPaydayPromptStorageKey } from '@/common/paydayBudget.js'

	function getCurrentDateTimeValue() {
		const date = new Date()
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const hour = String(date.getHours()).padStart(2, '0')
		const minute = String(date.getMinutes()).padStart(2, '0')
		return `${year}-${month}-${day} ${hour}:${minute}`
	}

	export default {
		components: {
			TimePicker
		},
		data() {
			return {
				amount: '',
				recordAt: getCurrentDateTimeValue(),
				remark: '',
				activeType: '支出',
				recordTypes: ['支出', '收入'],
				selectedCategory: getDefaultBillCategory(),
				categories: billCategories,
				paydayPromptCycleKey: '',
				paydayPromptMode: false
			}
		},
		onLoad(options = {}) {
			const paydayPrompt = this.decodeQueryValue(options.paydayPrompt) === '1'
			const recordType = this.decodeQueryValue(options.recordType).toLowerCase()
			const categoryValue = this.decodeQueryValue(options.categoryValue || options.value)

			if (paydayPrompt) {
				this.paydayPromptMode = true
				this.paydayPromptCycleKey = this.decodeQueryValue(options.paydayCycleKey)
				this.applyPaydayRecordPreset()
				return
			}

			if (recordType === 'income' && categoryValue === '14') {
				this.applyPaydayRecordPreset()
				return
			}

			if (categoryValue) this.selectCategoryByValue(categoryValue)
		},
		onShow() {
			if (this.paydayPromptMode) this.applyPaydayRecordPreset()
		},
		computed: {
			activeCategoryType() {
				return this.activeType === '收入' ? '2' : '1'
			},
			visibleCategories() {
				return this.categories.filter((item) => {
					const type = String(item.type)
					return type === '0' || type === this.activeCategoryType
				})
			}
		},
		methods: {
			decodeQueryValue(value) {
				const text = String(value || '')
				if (!text) return ''

				try {
					return decodeURIComponent(text)
				} catch (error) {
					return text
				}
			},
			applyPaydayRecordPreset() {
				this.activeType = '收入'
				const salaryCategory = getBillCategoryByValue('14') || getBillCategoryByName('工资')
				if (salaryCategory) this.selectedCategory = { ...salaryCategory }
			},
			getTodayDate() {
				const date = new Date()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${date.getFullYear()}-${month}-${day}`
			},
			selectRecordType(item) {
				this.activeType = item
				this.ensureSelectedCategory()
			},
			ensureSelectedCategory() {
				const isSelectedVisible = this.visibleCategories.some((item) => item.name === this.selectedCategory.name)
				if (!isSelectedVisible && this.visibleCategories.length) {
					this.selectedCategory = { ...this.visibleCategories[0] }
				}
			},
			selectCategory(item) {
				this.selectedCategory = { ...item }
			},
			selectCategoryByValue(value) {
				const category = getBillCategoryByValue(value)
				if (!category) return

				this.activeType = String(category.type) === '2' ? '收入' : '支出'
				this.selectedCategory = { ...category }
				this.ensureSelectedCategory()
			},
			normalizeAmount(value) {
				let nextValue = String(value || '').replace(/[^\d.]/g, '')
				const parts = nextValue.split('.')

				if (parts.length > 2) {
					nextValue = `${parts[0]}.${parts.slice(1).join('')}`
				}

				const [integer = '', decimal = ''] = nextValue.split('.')
				const safeInteger = integer.replace(/^0+(?=\d)/, '')
				if (nextValue.includes('.')) {
					return `${safeInteger || '0'}.${decimal.slice(0, 2)}`
				}

				return safeInteger
			},
			handleAmountInput(event) {
				const value = event.detail ? event.detail.value : event.target.value
				this.amount = this.normalizeAmount(value)
			},
			validateAmount() {
				const value = Number(this.amount)

				if (!this.amount || !value) {
					this.amount = ''
					uni.showToast({ title: '请输入正确金额', icon: 'none' })
					return false
				}

				this.amount = value.toFixed(2)
				return true
			},
			async saveRecord() {
				if (!this.validateAmount()) return

				const record = {
					id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
					date: this.normalizeRecordDate(this.recordAt),
					submittedAt: new Date().toISOString(),
					tradeType: this.activeType,
					category: this.selectedCategory.name,
					money: this.amount,
					remark: this.remark.trim()
				}
				const bills = uni.getStorageSync('mock_bill_data') || []
				const nextBills = Array.isArray(bills) ? [record, ...bills] : [record]
				uni.setStorageSync('mock_bill_data', nextBills)
				this.markPaydayPromptHandled()

				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					try {
						await saveUserConfig(`${phone}BillMoney`, JSON.stringify(nextBills), '哆米记账账单数据')
					} catch (error) {
						// uni.showToast({ title: '账单已本地保存', icon: 'none' })
					}
				}

				uni.showToast({ title: '已保存', icon: 'success' })
				setTimeout(() => {
					this.backHome()
				}, 650)
			},
			markPaydayPromptHandled() {
				if (!this.paydayPromptCycleKey) return

				const account = getStoredPhone() || 'default-user'
				uni.setStorageSync(getPaydayPromptStorageKey(account, this.paydayPromptCycleKey), true)
			},
			normalizeRecordDate(value) {
				const text = String(value || '')
				return text.length === 16 ? `${text}:00` : text
			},
			closePage() {
				uni.navigateBack({
					delta: 1,
					fail: () => this.backHome()
				})
			},
			backHome() {
				uni.switchTab({ url: '/pages/home/index' })
			}
		}
	}
</script>

<style>
	page {
		background: #f8f4ed;
	}

	.add-page {
		min-height: var(--app-window-height, 100vh);
		padding: calc(36rpx + var(--app-safe-top, env(safe-area-inset-top))) 44rpx 36rpx;
		background:
			radial-gradient(circle at 14% 4%, var(--shell-accent-soft), transparent 300rpx),
			radial-gradient(circle at 92% 18%, var(--shell-accent-deep), transparent 300rpx),
			var(--shell-background);
		color: #0d2839;
		box-sizing: border-box;
	}

	.nav-row,
	.type-tabs,
	.category-grid {
		display: flex;
		align-items: center;
	}

	.nav-row {
		margin-top: 10rpx;
		justify-content: center;
	}

	.nav-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #0d2839;
	}

	.amount-section {
		margin-top: 70rpx;
		text-align: center;
	}

	.amount-meta {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: #8b93a0;
	}

	.amount-value {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 28rpx;
		line-height: 1;
	}

	.currency {
		margin-right: 10rpx;
		font-size: 44rpx;
		font-weight: 700;
		color: #8b93a0;
	}

	.amount-input {
		width: 420rpx;
		height: 128rpx;
		font-size: 100rpx;
		font-weight: 900;
		letter-spacing: 0;
		color: #1a2530;
		line-height: 128rpx;
		text-align: left;
	}

	.amount-input::placeholder {
		color: #8b93a0;
	}

	.type-tabs {
		margin-top: 60rpx;
		padding: 8rpx;
		border-radius: 999rpx;
		background: #f0eadf;
	}

	.type-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		height: 82rpx;
		border-radius: 999rpx;
		font-size: 29rpx;
		font-weight: 800;
		color: #8b93a0;
	}

	.type-tab.active {
		background: #fff;
		color: #e07a5f;
		box-shadow: 0 8rpx 22rpx rgba(13, 40, 57, 0.08);
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 18rpx;
		margin-top: 48rpx;
	}

	.category-item {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		min-height: 134rpx;
		border: 3rpx solid transparent;
		border-radius: 32rpx;
		background: #fff;
		box-sizing: border-box;
	}

	.category-item.active {
		border-color: #e8a6b2;
		background: #f9eaeb;
	}

	.category-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76rpx;
		height: 76rpx;
		border-radius: 24rpx;
		font-size: 26rpx;
		font-weight: 800;
	}

	.category-icon image {
		width: 42rpx;
		height: 42rpx;
	}

	.category-name {
		display: block;
		margin-top: 12rpx;
		font-size: 23rpx;
		font-weight: 600;
		color: #253445;
	}

	.record-panel {
		margin-top: 34rpx;
		padding: 0 30rpx;
		border-radius: 32rpx;
		background: #fff;
		box-shadow: 0 14rpx 36rpx rgba(13, 40, 57, 0.06);
	}

	.record-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 116rpx;
		gap: 24rpx;
	}

	.record-row + .record-row {
		border-top: 1rpx solid rgba(20, 58, 85, 0.08);
	}

	.record-label,
	.record-desc {
		display: block;
	}

	.record-label {
		font-size: 28rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.record-desc {
		margin-top: 8rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #8b93a0;
	}

	.remark-row {
		align-items: center;
	}

	.remark-input {
		flex: 1;
		min-width: 0;
		height: 78rpx;
		font-size: 27rpx;
		font-weight: 700;
		color: #143a55;
		line-height: 78rpx;
		text-align: right;
	}

	.remark-input::placeholder {
		color: #b1a89d;
	}

	.bottom-actions {
		position: relative;
		display: flex;
		gap: 18rpx;
		margin: 28rpx -44rpx 0;
		padding: 12rpx 44rpx;
		padding-bottom: 12rpx;
		border-radius: 0;
		box-sizing: border-box;
}

	.bottom-button {
		flex: 1;
		height: 86rpx;
		line-height: 86rpx;
		border-radius: 22rpx;
		font-size: 28rpx;
		font-weight: 800;
		text-align: center;
		box-sizing: border-box;
	}

	.bottom-button.cancel {
		border: 1rpx solid rgba(20, 58, 85, 0.1);
		background: #f1eadf;
		color: #52606c;
	}

	.bottom-button.confirm {
		background: #143a55;
		color: #fff;
		box-shadow: 0 14rpx 30rpx rgba(20, 58, 85, 0.18);
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

	@media screen and (min-width: 768px) {
		.add-page {
			max-width: 430px;
			margin: 0 auto;
			box-shadow: 0 24px 70px rgba(13, 40, 57, 0.16);
		}
	}
</style>
