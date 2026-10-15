<template>
	<view class="bd-page stats-page" :class="themeClass" :style="pageHeightStyle">
		<page-top
			eyebrow="PERIOD INSIGHTS"
			title="周期洞察"
			subtitle="按日、月或年查看支出去向与预算执行。"
		/>

		<view class="period-tabs">
			<view
				v-for="tab in periodTabs"
				:key="tab.value"
				class="period-tab"
				:class="{ active: selectedPeriod === tab.value }"
				@tap="switchPeriod(tab.value)"
			>
				<text>{{ tab.label }}</text>
			</view>
		</view>

		<view class="bd-card donut-card">
			<view v-if="categories.length" class="expense-summary">
				<text class="fallback-title">总支出</text>
				<text class="fallback-value">¥{{ formatAmount(totalExpense) }}</text>
			</view>
			<view v-if="categories.length" class="legend-list">
				<view v-for="item in categories" :key="item.name" class="legend-item">
					<view class="legend-dot" :class="item.tone"></view>
					<text>{{ item.name }}</text>
					<text>{{ item.percent }}%</text>
				</view>
			</view>
			<view v-else class="empty-data block-empty">
				<text>暂无数据</text>
			</view>
		</view>

		<item-header :title="trendTitle" />

		<view class="bd-card trend-card">
			<!-- #ifdef H5 -->
			<view v-if="hasTrendData" id="trendBarChart" class="chart bar-chart"></view>
			<view v-else class="empty-data block-empty">
				<text>暂无数据</text>
			</view>
			<!-- #endif -->
			<!-- #ifndef H5 -->
			<view v-if="hasTrendData" class="trend-bars">
				<view v-for="item in trends" :key="item.month" class="trend-item">
					<view class="trend-track">
						<view class="trend-bar-stage" :style="{ height: item.height }">
							<text class="trend-value">{{ formatAmount(item.value) }}</text>
							<view class="trend-bar" :class="{ active: item.active }"></view>
						</view>
					</view>
					<text>{{ item.month }}</text>
				</view>
			</view>
			<view v-else class="empty-data block-empty">
				<text>暂无数据</text>
			</view>
			<!-- #endif -->
		</view>

		<item-header title="预算执行" link-text="更多" link-url="/pages/budget/index" />

		<view class="bd-card">
			<template v-if="budgets.length">
				<view v-for="item in budgets" :key="item.name" class="budget-row">
				<view class="budget-top">
					<text>{{ item.name }}</text>
					<text>{{ item.usedText }}</text>
				</view>
				<view class="bd-progress">
					<view class="bd-progress-fill" :class="item.tone" :style="{ width: item.progress }"></view>
				</view>
			</view>
			</template>
			<view v-else class="empty-data block-empty">
				<text>暂无数据</text>
			</view>
		</view>
	</view>
</template>

<script>
	// #ifdef H5
	import * as echarts from 'echarts'
	// #endif
  import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import { getStoredPhone, getUserConfig, loadBillData, readJsonConfig, toBillItem } from '@/api/index.js'
	import { billCategories } from '@/common/categories.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'
	import { getCategoryStatsByPeriod, getCurrentMonth, getPeriodTrends, getTotalByType, normalizeMonth, getBillsByPeriod } from '@/common/insights.js'

	function getTodayDateValue() {
		const date = new Date()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return `${date.getFullYear()}-${month}-${day}`
	}

	export default {
		components: {
      PageTop,
			ItemHeader
		},
		data() {
			return {
				trendChart: null,
				transactions: [],
				currentMonth: getCurrentMonth(),
				budgetMonth: getTodayDateValue(),
				budgetStorage: readJsonConfig(uni.getStorageSync('monthlyBudgets'), {}),
				selectedPeriod: 'day',
				periodTabs: [
					{ label: '日', value: 'day' },
					{ label: '月', value: 'month' },
					{ label: '年', value: 'year' }
				],
				categories: [],
				trends: [],
				budgets: []
			}
		},
		computed: {
			trendTitle() {
				const labels = { day: '天', week: '周', month: '个月', year: '年' }
				return `最近 6 ${labels[this.selectedPeriod] || '个月'}`
			},
			totalExpense() {
				return getTotalByType(this.periodTransactions, 'out')
			},
			periodTransactions() {
				return getBillsByPeriod(this.transactions, this.selectedPeriod)
			},
			hasTrendData() {
				return this.trends.some((item) => item.value > 0)
			}
		},
		onShow() {
			this.currentMonth = getCurrentMonth()
			this.loadBills()
			this.loadBudgets()
		},
		onReady() {
			// #ifdef H5
			this.$nextTick(() => {
				setTimeout(() => {
					this.initCharts()
				}, 0)
			})
			// #endif
		},
		onUnload() {
			// #ifdef H5
			window.removeEventListener('resize', this.resizeCharts)
			if (this.trendChart) this.trendChart.dispose()
			this.trendChart = null
			// #endif
		},
		methods: {
			async loadBills() {
				const bills = await loadBillData()
				this.transactions = bills.map(toBillItem)
				this.buildStats()
				this.$nextTick(() => this.initCharts())
			},
			buildStats() {
				this.categories = getCategoryStatsByPeriod(this.transactions, this.selectedPeriod)
				this.trends = getPeriodTrends(this.transactions, this.selectedPeriod, 6)
				this.buildBudgetRows()
			},
			switchPeriod(period) {
				if (this.selectedPeriod === period) return
				this.selectedPeriod = period
				this.budgetMonth = period === 'day'
					? getTodayDateValue()
					: period === 'month'
						? getCurrentMonth()
						: String(new Date().getFullYear())
				this.categories = getCategoryStatsByPeriod(this.transactions, period)
				this.trends = getPeriodTrends(this.transactions, period, 6)
				this.buildBudgetRows()
				this.$nextTick(() => this.renderCharts())
			},
			buildBudgetRows() {
				const values = this.getBudgetValuesForSelection()
				const usedByCategory = {}

				getBillsByPeriod(this.transactions, this.selectedPeriod, this.getBudgetReferenceDate()).forEach((item) => {
					if (item.type !== 'out') return
					usedByCategory[item.category] = (usedByCategory[item.category] || 0) + Number(item.money || 0)
				})

				this.budgets = billCategories
					.filter((category) => category.type !== '2' && Number(values[category.name] || 0) > 0)
					.map((category) => {
						const amount = Number(values[category.name] || 0)
						const used = Number(usedByCategory[category.name] || 0)
						const percent = amount ? Math.min(Math.round((used / amount) * 100), 100) : 0
						return {
							...category,
							amount,
							used,
							usedText: `¥${this.formatAmount(used)} / ${this.formatAmount(amount)}`,
							progress: `${percent}%`
						}
					})
			},
			getBudgetValues(month) {
				const targetMonth = normalizeMonth(month)
				const storage = this.budgetStorage
				if (!targetMonth || !storage || typeof storage !== 'object' || Array.isArray(storage)) return {}

				const matchedKey = Object.keys(storage).find((key) => normalizeMonth(key) === targetMonth)
				const values = matchedKey ? readJsonConfig(storage[matchedKey], {}) : {}
				return values && typeof values === 'object' && !Array.isArray(values) ? values : {}
			},
			getBudgetValuesForSelection() {
				if (this.selectedPeriod !== 'year') {
					return this.getBudgetValues(this.budgetMonth)
				}

				const year = String(this.budgetMonth || '').match(/^\d{4}/)
				if (!year) return {}
				return Object.keys(this.budgetStorage || {})
					.filter((key) => String(key).startsWith(year[0]))
					.reduce((result, key) => {
						const values = readJsonConfig(this.budgetStorage[key], {})
						if (!values || typeof values !== 'object' || Array.isArray(values)) return result
						Object.keys(values).forEach((name) => {
							result[name] = Number(result[name] || 0) + Number(values[name] || 0)
						})
						return result
					}, {})
			},
			getBudgetReferenceDate() {
				const text = String(this.budgetMonth || '')
				const match = text.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/) 
				if (!match) return new Date()
				return new Date(
					Number(match[1]),
					Number(match[2] || 1) - 1,
					Number(match[3] || 1)
				)
			},
			formatAmount(value) {
				return formatDisplayAmount(value)
			},
			async loadBudgets() {
				this.budgetStorage = readJsonConfig(uni.getStorageSync('monthlyBudgets'), {})

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) {
					this.buildBudgetRows()
					return
				}

				try {
					const budgetConfig = await getUserConfig(`${phone}MonthlyBudgets`)
					const remoteBudgets = readJsonConfig(budgetConfig, {})
					if (remoteBudgets && typeof remoteBudgets === 'object' && !Array.isArray(remoteBudgets)) {
						this.budgetStorage = remoteBudgets
						uni.setStorageSync('monthlyBudgets', remoteBudgets)
					}
				} catch (error) {
					// Keep locally cached budgets when the remote request is unavailable.
				} finally {
					this.buildBudgetRows()
				}
			},
			initCharts() {
				// #ifdef H5
				const trendDom = document.getElementById('trendBarChart')
				if (trendDom) {
					if (this.trendChart && this.trendChart.getDom() !== trendDom) {
						this.trendChart.dispose()
						this.trendChart = null
					}
					this.trendChart = echarts.getInstanceByDom(trendDom) || this.trendChart || echarts.init(trendDom)
				} else if (this.trendChart) {
					this.trendChart.dispose()
					this.trendChart = null
				}
				if (!this.trendChart) return

				this.renderCharts()
				this.bindTooltipEvents()
				window.addEventListener('resize', this.resizeCharts)
				// #endif
			},
			bindTooltipEvents() {
				// #ifdef H5
				this.bindChartTooltipEvent(this.trendChart)
				// #endif
			},
			bindChartTooltipEvent(chart) {
				// #ifdef H5
				if (!chart) return

				const showTip = (params) => {
					if (params.componentType !== 'series') return

					chart.dispatchAction({
						type: 'showTip',
						seriesIndex: params.seriesIndex,
						dataIndex: params.dataIndex
					})
				}

				chart.off('click')
				chart.off('mouseover')
				chart.on('click', showTip)
				chart.on('mouseover', showTip)
				// #endif
			},
			renderCharts() {
				// #ifdef H5
				if (this.trendChart) this.trendChart.setOption(this.createTrendOption(), true)
				// #endif
			},
			resizeCharts() {
				// #ifdef H5
				if (this.trendChart) {
					this.trendChart.resize()
					this.renderCharts()
				}
				// #endif
			},
			getTrendBarWidth() {
				const chartWidth = this.trendChart && this.trendChart.getWidth
					? this.trendChart.getWidth()
					: 360
				const trendCount = Math.max(this.trends.length, 1)
				const categoryWidth = chartWidth / trendCount

				return Math.max(8, Math.min(14, Math.round(categoryWidth * 0.24)))
			},
			createTrendOption() {
				return {
					grid: { left: 6, right: 6, top: 34, bottom: 28, containLabel: false },
					tooltip: {
						trigger: 'axis',
						triggerOn: 'mousemove|click',
						confine: true,
						axisPointer: { type: 'shadow' },
						formatter: (params) => {
							const item = params[0]
							return `${item.name}<br/>支出：¥${this.formatAmount(item.value)}`
						}
					},
					xAxis: {
						type: 'category',
						data: this.trends.map((item) => item.label),
						axisTick: { show: false },
						axisLine: {
							show: true,
							lineStyle: { color: 'rgba(126, 136, 150, 0.35)', width: 1 }
						},
						axisLabel: { color: '#7e8896', fontSize: 11 }
					},
					yAxis: {
						type: 'value',
						show: false
					},
					series: [{
						name: '周期支出',
						type: 'bar',
						barWidth: this.getTrendBarWidth(),
						barMaxWidth: 14,
						label: {
							show: true,
							position: 'top',
							color: '#4a5764',
							fontSize: 11,
							formatter: (params) => this.formatAmount(params.value)
						},
						data: this.trends.map((item) => ({
							value: item.value,
							itemStyle: {
								borderRadius: [12, 12, 6, 6],
								color: item.active ? '#b59ec2' : '#7fb9a6'
							}
						})),
						emphasis: { focus: 'series' }
					}]
				}
			}
		}
	}
</script>

<style>
	.period-tabs {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 28rpx;
		padding: 6rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.68);
		box-shadow: 0 8rpx 22rpx rgba(20, 58, 85, 0.05);
	}

	.period-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		height: 62rpx;
		border-radius: 14rpx;
		font-size: 24rpx;
		color: #7e8896;
		transition: background-color 0.18s ease, color 0.18s ease;
	}

	.period-tab.active {
		background: #143a55;
		color: #fff;
		font-weight: 700;
	}

	.donut-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 20rpx;
		margin-top: 28rpx;
	}

	.expense-summary {
		padding-bottom: 18rpx;
		border-bottom: 1rpx solid rgba(20, 58, 85, 0.08);
	}

	.chart {
		flex: 0 0 auto;
	}

	.bar-chart {
		width: 100%;
		height: 300rpx;
	}

	.fallback-title,
	.fallback-value {
		display: block;
	}

	.fallback-title {
		font-size: 20rpx;
		color: #7e8896;
	}

	.fallback-value {
		margin-top: 4rpx;
		font-size: 26rpx;
		font-weight: 800;
		color: #143a55;
	}

	.legend-item text,
	.trend-item text,
	.budget-top text {
		display: block;
	}

	.legend-list {
		flex: 1;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 8rpx 0;
		font-size: 23rpx;
		color: #4a5764;
	}

	.legend-item text:nth-child(2) {
		flex: 1;
	}

	.legend-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 999rpx;
	}

	.legend-dot.tone-coral,
	.bd-progress-fill.tone-coral { background: #e07a5f; }
	.legend-dot.tone-murex,
	.bd-progress-fill.tone-murex { background: #b59ec2; }
	.legend-dot.tone-foam,
	.bd-progress-fill.tone-foam { background: #7fb9a6; }
	.legend-dot.tone-sand { background: #d4b896; }

	.trend-bars {
		display: flex;
		align-items: flex-end;
		gap: 18rpx;
		height: 250rpx;
		padding-top: 34rpx;
		box-sizing: border-box;
	}

	.trend-item {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		height: 100%;
		font-size: 20rpx;
		color: #7e8896;
	}

	.trend-value {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 6rpx);
		z-index: 1;
		width: 100%;
		font-size: 18rpx;
		line-height: 1.2;
		text-align: center;
		color: #4a5764;
		white-space: nowrap;
		transform: translateX(-50%);
	}

	.trend-track {
		position: relative;
		display: flex;
		align-items: flex-end;
		width: 100%;
		flex: 1;
		overflow: visible;
	}

	.trend-bar-stage {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 34rpx;
		min-height: 30rpx;
		transform: translateX(-50%);
	}

	.trend-bar-stage .trend-bar {
		height: 100%;
	}

	.trend-bar {
		width: 100%;
		min-height: 30rpx;
		border-radius: 999rpx 999rpx 12rpx 12rpx;
		background: linear-gradient(180deg, #7fb9a6, #3b6e89);
	}

	.trend-bar.active {
		background: linear-gradient(180deg, #e8b4bc, #b59ec2);
	}

	.budget-row + .budget-row {
		margin-top: 24rpx;
	}

	.budget-top {
		display: flex;
		justify-content: space-between;
		font-size: 23rpx;
		color: #4a5764;
	}

	.empty-data {
		font-size: 23rpx;
		color: #9aa2ab;
		text-align: center;
	}

	.block-empty {
		padding: 64rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.68);
	}

</style>
