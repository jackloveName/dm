<template>
	<view class="bd-page category-page" :class="themeClass" :style="pageHeightStyle">
    <page-top
			eyebrow="SPENDING MAP"
			title="支出去向"
			subtitle="按分类看清支出重点，再回到预算里调整。"
		/>

		<view class="summary-card">
			<text class="summary-label">{{ monthTitle || '本月' }}已记录</text>
			<text class="summary-value">{{ monthTransactions.length }} 笔</text>
			<text class="summary-copy">{{ summaryCopy }}</text>
		</view>

		<item-header title="支出分类">
			<template #action>
				<time-picker v-model="currentMonth" format="YYYY-MM" :max-date="getTodayDate()" />
			</template>
		</item-header>

		<view class="category-grid">
			<view v-for="item in categories" :key="item.name" class="bd-card category-card" @tap="openCategoryBills(item)">
				<view class="bd-icon" :class="item.tone"><image :src="item.iconPath" mode="aspectFit"></image></view>
				<view class="category-body">
					<view class="bd-card-head">
						<text class="category-name">{{ item.name }}</text>
						<text class="category-percent">{{ item.percent }}</text>
					</view>
					<text class="category-amount">¥{{ formatAmount(item.amount) }}</text>
					<view class="bd-progress">
						<view class="bd-progress-fill" :class="item.tone" :style="{ width: item.progress }"></view>
					</view>
				</view>
			</view>
		</view>

		<view v-if="!categories.length" class="empty-data">
			<text>暂无数据</text>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import TimePicker from '@/components/timePicker/index.vue'
	import { loadBillData, toBillItem } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'
	import { getCategoryStats, getCurrentMonth, getBillsByMonth, normalizeMonth } from '@/common/insights.js'

	export default {
		components: {
			PageTop,
			ItemHeader,
			TimePicker
		},
		data() {
			return {
				transactions: [],
				currentMonth: getCurrentMonth()
			}
		},
		onShow() {
			this.loadBills()
		},
		computed: {
			monthTransactions() {
				return getBillsByMonth(this.transactions, this.currentMonth)
			},
			categories() {
				return getCategoryStats(this.transactions, this.currentMonth)
			},
			monthTitle() {
				const selectedMonth = normalizeMonth(this.currentMonth)
				const month = Number((selectedMonth || '').split('-')[1] || 0)
				return month ? `${month}月` : ''
			},
			summaryCopy() {
				const topCategory = this.categories[0]
				const monthText = this.monthTitle || '本月'
				if (!topCategory) return `${monthText}暂无支出记录。`
				return `${topCategory.name}是${monthText}主要支出，占比 ${topCategory.percent}%。`
			}
		},
		methods: {
			getTodayDate() {
				const date = new Date()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${date.getFullYear()}-${month}-${day}`
			},
			formatAmount(value) {
				return formatDisplayAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			},
			async loadBills() {
				const bills = await loadBillData()
				this.transactions = bills.map(toBillItem)
			},
			openCategoryBills(item) {
				if (!item || !item.name) return

				const url = `/pages/bill/index?category=${encodeURIComponent(item.name)}&month=${encodeURIComponent(normalizeMonth(this.currentMonth))}`
				uni.navigateTo({
					url,
					fail: () => uni.showToast({ title: '页面暂不可用', icon: 'none' })
				})
			}
		}
	}
</script>

<style>
	.summary-card {
		margin-top: 34rpx;
		padding: 34rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #f0d5d8, #b59ec2 56%, #7fb9a6);
		box-shadow: 0 18rpx 42rpx rgba(181, 158, 194, 0.22);
	}

	.summary-label,
	.summary-value,
	.summary-copy,
	.category-name,
	.category-percent,
	.category-amount {
		display: block;
	}

	.summary-label {
		font-size: 22rpx;
		letter-spacing: 3rpx;
		color: rgba(13, 40, 57, 0.68);
	}

	.summary-value {
		margin-top: 10rpx;
		font-size: 54rpx;
		font-weight: 800;
		color: #0d2839;
	}

	.summary-copy {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: #1f4e6e;
	}

	.category-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 18rpx;
	}

	.category-card {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.category-body {
		flex: 1;
		min-width: 0;
	}

	.category-name {
		font-size: 27rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.category-percent {
		font-size: 23rpx;
		font-weight: 700;
		color: #7e8896;
	}

	.category-amount {
		margin-top: 6rpx;
		font-size: 30rpx;
		font-weight: 800;
		color: #143a55;
	}

	.bd-icon image {
		width: 38rpx;
		height: 38rpx;
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
</style>
