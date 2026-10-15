<template>
	<view class="bd-page archive-page" :class="themeClass" :style="pageHeightStyle">
		<view class="archive-nav">
			<go-back inline fallback-url="/pages/objective/index" fallback-mode="reLaunch" />
			<text class="archive-title">计划归档</text>
			<view class="archive-nav-placeholder"></view>
		</view>

		<view class="status-tabs">
			<view
				v-for="tab in statusTabs"
				:key="tab.value"
				class="status-tab"
				:class="{ active: activeStatus === tab.value }"
				@tap="switchStatus(tab.value)"
			>
				<text>{{ tab.label }}</text>
			</view>
		</view>

		<view class="archive-plan-list">
			<saving-plan-list display-mode="archive" :plans="displayPlans" :deleting-plan-id="deletingPlanId" @delete="deletePlan" />
		</view>
	</view>
</template>

<script>
	import GoBack from '@/components/goBack/index.vue'
	import SavingPlanList from '@/components/savingPlanList/index.vue'
	import { getStoredPhone, getUserConfig, readJsonConfig, saveUserConfig } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	export default {
		components: {
			GoBack,
			SavingPlanList
		},
		data() {
			return {
				activeStatus: 'completed',
				statusTabs: [
					{ label: '已完成计划', value: 'completed' },
					{ label: '已失败计划', value: 'failed' }
				],
				plans: [],
				deletingPlanId: ''
			}
		},
		computed: {
			completedPlans() {
				return this.plans.filter((item) => this.isPlanCompleted(item))
			},
			failedPlans() {
				return this.plans.filter((item) => this.isPlanFailed(item))
			},
			displayPlans() {
				return this.activeStatus === 'completed' ? this.completedPlans : this.failedPlans
			}
		},
		onShow() {
			this.loadPlans()
		},
		methods: {
			formatAmount(value) {
				return formatDisplayAmount(value)
			},
			padDate(value) {
				return String(value).padStart(2, '0')
			},
			getTodayDate() {
				const date = new Date()
				return `${date.getFullYear()}-${this.padDate(date.getMonth() + 1)}-${this.padDate(date.getDate())}`
			},
			normalizePlanDeadline(value) {
				const text = String(value || '')
				const fullMatch = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/)
				if (fullMatch) {
					return `${fullMatch[1]}-${this.padDate(fullMatch[2])}-${this.padDate(fullMatch[3])}`
				}

				const monthMatch = text.match(/(\d{4})[-/年](\d{1,2})/)
				if (monthMatch) {
					return `${monthMatch[1]}-${this.padDate(monthMatch[2])}-01`
				}

				return ''
			},
			getPlanDeadlineText(value) {
				const deadline = this.normalizePlanDeadline(value)
				if (!deadline) return value || '暂未设置'

				const [year, month, day] = deadline.split('-')
				return `${year}年${Number(month)}月${Number(day)}日`
			},
			normalizePlans(value) {
				const parsed = readJsonConfig(value, null)
				const source = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])

				return source.map((item, index) => ({
					id: item.id || `sp_${Date.now()}_${index}`,
					name: item.name || '攒钱计划',
					targetAmount: Number(item.targetAmount || 0),
					savedAmount: Number(item.savedAmount || item.currentAmount || 0),
					deadline: this.normalizePlanDeadline(item.deadline || item.targetDate),
					iconPath: item.iconPath || '/static/images/category/icon_goal.png',
					tone: item.tone || 'tone-sky'
				})).filter((item) => item.targetAmount > 0)
			},
			async loadPlans() {
				this.plans = this.normalizePlans(uni.getStorageSync('savings_plan'))

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const planConfig = await getUserConfig(`${phone}SavingsPlan`)
					const parsed = readJsonConfig(planConfig, null)
					if (Array.isArray(parsed)) {
						this.plans = this.normalizePlans(parsed)
						uni.setStorageSync('savings_plan', this.plans)
					}
				} catch (error) {
					uni.showToast({ title: '攒钱计划请求失败', icon: 'none' })
				}
			},
			isPlanCompleted(item) {
				return Number(item.savedAmount || 0) >= Number(item.targetAmount || 0)
			},
			isPlanFailed(item) {
				if (this.isPlanCompleted(item)) return false
				const deadline = this.normalizePlanDeadline(item.deadline)
				return Boolean(deadline) && deadline < this.getTodayDate()
			},
			getPlanProgress(item) {
				const target = Number(item.targetAmount || 0)
				if (!target) return 0
				return Math.min(Math.round((Number(item.savedAmount || 0) / target) * 100), 100)
			},
			switchStatus(status) {
				this.activeStatus = status
			},
			async deletePlan(plan) {
				if (this.deletingPlanId) return

				if (!plan) return

				const nextPlans = this.plans.filter((item) => item.id !== plan.id)
				const phone = getStoredPhone()
				this.deletingPlanId = plan.id

				try {
					if (phone && uni.getStorageSync('App-Token')) {
						await saveUserConfig(`${phone}SavingsPlan`, JSON.stringify(nextPlans), '哆米记账攒钱计划')
					}
					this.plans = nextPlans
					uni.setStorageSync('savings_plan', nextPlans)
					uni.showToast({ title: '计划已删除', icon: 'success' })
				} catch (error) {
					uni.showToast({ title: '删除失败，请重试', icon: 'none' })
				} finally {
					this.deletingPlanId = ''
				}
			}
		}
	}
</script>

<style>
	.archive-page {
		padding-top: calc(34rpx + var(--app-safe-top, env(safe-area-inset-top)));
		padding-bottom: 90rpx;
	}

	.archive-nav {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.archive-nav-placeholder {
		width: 72rpx;
		height: 72rpx;
	}

	.archive-title {
		position: absolute;
		left: 50%;
		top: 50%;
		font-size: 34rpx;
		font-weight: 800;
		color: #0d2839;
		transform: translate(-50%, -50%);
	}

	.status-tabs {
		display: flex;
		gap: 12rpx;
		margin-top: 30rpx;
		padding: 8rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.72);
		box-shadow: 0 10rpx 26rpx rgba(20, 58, 85, 0.05);
		box-sizing: border-box;
	}

	.status-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		height: 68rpx;
		border-radius: 999rpx;
		font-size: 25rpx;
		font-weight: 700;
		color: #7e8896;
	}

	.status-tab.active {
		background: #143a55;
		color: #fff;
	}

	.status-tab text:last-child {
		font-size: 21rpx;
		opacity: 0.78;
	}

	.archive-plan-list {
		margin-top: 24rpx;
	}
</style>
