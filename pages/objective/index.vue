<template>
	<view class="bd-page objective-page" :class="themeClass" :style="pageHeightStyle">
		<go-back />

		<page-top
			eyebrow="SAVING PLAN"
			title="攒钱计划"
			subtitle="把每一个小目标，慢慢存成喜欢的生活。"
		/>

		<view class="saving-overview">
			<view class="saving-overview-copy">
				<text class="overview-eyebrow">累计已攒</text>
				<text class="overview-amount">¥{{ totalSavedText }}</text>
				<text class="overview-target">{{ activePlans.length ? `距离计划目标 ¥${totalTargetText} 还差 ¥${remainingText}` : '暂无数据' }}</text>
			</view>
			<view class="saving-shell">
				<image src="/static/images/shell-05.png" mode="aspectFit"></image>
			</view>
			<view class="overview-progress">
				<view class="overview-progress-fill" :style="{ width: totalProgress + '%' }"></view>
			</view>
			<view class="overview-footer">
				<text>{{ activePlans.length ? `${activePlans.length} 个进行中的计划` : '暂无数据' }}</text>
				<text v-if="activePlans.length">{{ totalProgress }}% 已完成</text>
			</view>
		</view>

		<item-header title="我的计划">
			<template #action>
				<view class="plan-more" @tap="openPlanArchive">
					<text>更多</text>
					<text>›</text>
				</view>
			</template>
		</item-header>

		<saving-plan-list :plans="activePlans" :deleting-plan-id="deletingPlanId" @planTap="openPlanEditor" @delete="deletePlan" />

		<view v-if="showPlanEditor" class="plan-editor-mask" @tap="closePlanEditor" @touchmove.stop.prevent>
			<view class="plan-editor-panel" @tap.stop @touchmove.stop>
				<text class="editor-title">{{ editingIndex === -1 ? '新建攒钱计划' : '编辑攒钱计划' }}</text>
				<text class="editor-subtitle">给目标留一点时间，也给自己一点期待。</text>
				<view class="editor-field">
					<text class="editor-label">计划名称</text>
					<input v-model="editingPlan.name" class="editor-input" maxlength="16" placeholder="例如：旅行基金" />
				</view>
				<view class="editor-field">
					<text class="editor-label">目标金额</text>
					<view class="editor-money-input">
						<text>¥</text>
						<input v-model="editingPlan.targetAmount" class="editor-input" type="digit" maxlength="10" placeholder="请输入目标金额" />
					</view>
				</view>
				<view class="editor-field">
					<text class="editor-label">目标完成日期</text>
					<view class="editor-date-wrap">
						<time-picker
							v-model="editingPlan.deadline"
							format="YYYY-MM-DD"
							variant="record"
							placeholder="请选择日期"
							:show-arrow="true"
							:min-date="getTodayDate()"
						/>
					</view>
				</view>
				<view class="editor-field">
					<text class="editor-label">今日攒入</text>
					<view class="editor-money-input">
						<text>¥</text>
						<input v-model="todaySavedAmount" class="editor-input" type="digit" maxlength="10" placeholder="请输入今日攒入金额" />
					</view>
				</view>
				<view class="editor-actions">
					<view class="editor-button cancel" @tap="closePlanEditor">取消</view>
					<view class="editor-button confirm" @tap="savePlan">保存计划</view>
				</view>
			</view>
		</view>

		<view class="plan-create-fab" @tap="openNewPlan">
			<view class="plan-create-icon"><text>＋</text></view>
			<text>新建</text>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import TimePicker from '@/components/timePicker/index.vue'
	import SavingPlanList from '@/components/savingPlanList/index.vue'
	import { getStoredPhone, getUserConfig, readJsonConfig, saveUserConfig } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	const defaultPlan = {
		name: '',
		targetAmount: '',
		savedAmount: 0,
		deadline: '',
		iconPath: '/static/images/category/icon_goal.png',
		tone: 'tone-sky'
	}

	export default {
		components: {
			PageTop,
			ItemHeader,
			GoBack,
			TimePicker,
			SavingPlanList
		},
		data() {
			return {
				showPlanEditor: false,
				editingIndex: -1,
				editingPlan: { ...defaultPlan },
				todaySavedAmount: '',
				plans: [],
				deletingPlanId: ''
			}
		},
		onShow() {
			this.loadSavingsPlan()
		},
		computed: {
			activePlans() {
				return this.plans.filter((item) => !this.isPlanCompleted(item) && !this.isPlanFailed(item))
			},
			totalSaved() {
				return this.activePlans.reduce((sum, item) => sum + Number(item.savedAmount || 0), 0)
			},
			totalTarget() {
				return this.activePlans.reduce((sum, item) => sum + Number(item.targetAmount || 0), 0)
			},
			totalSavedText() {
				return this.formatAmount(this.totalSaved)
			},
			totalTargetText() {
				return this.formatAmount(this.totalTarget)
			},
			remainingText() {
				return this.formatAmount(Math.max(this.totalTarget - this.totalSaved, 0))
			},
			totalProgress() {
				if (!this.totalTarget) return 0
				return Math.min(Math.round((this.totalSaved / this.totalTarget) * 100), 100)
			}
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
			getFutureDate(days) {
				const date = new Date()
				date.setDate(date.getDate() + Number(days || 0))
				return `${date.getFullYear()}-${this.padDate(date.getMonth() + 1)}-${this.padDate(date.getDate())}`
			},
			normalizeSavingsPlans(value) {
				const parsed = readJsonConfig(value, null)
				const source = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])

				const plans = source.map((item, index) => ({
					id: item.id || `sp_${Date.now()}_${index}`,
					name: item.name || '攒钱计划',
					targetAmount: Number(item.targetAmount || 0),
					savedAmount: Number(item.savedAmount || item.currentAmount || 0),
					deadline: this.normalizePlanDeadline(item.deadline || item.targetDate),
					iconPath: item.iconPath || '/static/images/category/icon_goal.png',
					tone: item.tone || 'tone-sky'
				})).filter((item) => item.targetAmount > 0)

				return this.sortPlansByStatus(plans)
			},
			sortPlansByStatus(plans) {
				return [...plans].sort((first, second) => (
					Number(this.isPlanCompleted(first)) - Number(this.isPlanCompleted(second))
				))
			},
			normalizePlanDeadline(value) {
				const dateText = String(value)
				const fullMatch = dateText.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/)
				if (fullMatch) {
					return `${fullMatch[1]}-${this.padDate(fullMatch[2])}-${this.padDate(fullMatch[3])}`
				}

				const monthMatch = dateText.match(/(\d{4})[-/年](\d{1,2})/)
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
			getPlanRemainingDaysText(value) {
				const deadline = this.normalizePlanDeadline(value)
				if (!deadline) return '日期未设置'

				const [year, month, day] = deadline.split('-')
				const now = new Date()
				const deadlineDate = new Date(Number(year), Number(month) - 1, Number(day))
				const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
				const remainingDays = Math.round((deadlineDate - todayDate) / 86400000)

				if (remainingDays > 0) return `还剩${remainingDays}天`
				if (remainingDays === 0) return '今日到期'
				return `已过期${Math.abs(remainingDays)}天`
			},
			async loadSavingsPlan() {
				const localPlan = uni.getStorageSync('savings_plan')
				const localPlans = this.normalizeSavingsPlans(localPlan)
				this.plans = localPlans

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const planConfig = await getUserConfig(`${phone}SavingsPlan`)
					const plans = this.normalizeSavingsPlans(planConfig)
					if (plans.length || !localPlans.length) {
						this.plans = plans
						uni.setStorageSync('savings_plan', plans)
					}
				} catch (error) {
					uni.showToast({ title: '攒钱计划请求失败', icon: 'none' })
				}
			},
			getPlanProgress(item) {
				const target = Number(item.targetAmount || 0)
				if (!target) return 0
				return Math.min(Math.round((Number(item.savedAmount || 0) / target) * 100), 100)
			},
			isPlanCompleted(item) {
				return Number(item.savedAmount || 0) >= Number(item.targetAmount || 0)
			},
			isPlanFailed(item) {
				if (this.isPlanCompleted(item)) return false
				const deadline = this.normalizePlanDeadline(item.deadline)
				return Boolean(deadline) && deadline < this.getTodayDate()
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
			},
			openNewPlan() {
				this.editingIndex = -1
				this.editingPlan = { ...defaultPlan, deadline: this.getFutureDate(30) }
				this.todaySavedAmount = ''
				this.showPlanEditor = true
			},
			openPlanArchive() {
				uni.navigateTo({
					url: '/pages/objective/archive/index',
					fail: () => {
						uni.showToast({ title: '页面暂不可用', icon: 'none' })
					}
				})
			},
			openPlanEditor(plan) {
				if (!plan) return

				this.editingIndex = this.plans.findIndex((item) => item.id === plan.id)
				this.editingPlan = {
					...plan,
					deadline: this.normalizePlanDeadline(plan.deadline) || this.getTodayDate()
				}
				this.todaySavedAmount = ''
				this.showPlanEditor = true
			},
			closePlanEditor() {
				this.showPlanEditor = false
				this.editingIndex = -1
				this.editingPlan = { ...defaultPlan }
				this.todaySavedAmount = ''
			},
			async savePlan() {
				const name = String(this.editingPlan.name || '').trim()
				const targetAmount = Number(this.editingPlan.targetAmount)
				const currentSavedAmount = Number(this.editingPlan.savedAmount || 0)
				const todaySavedAmount = Number(String(this.todaySavedAmount || '').trim() || 0)
				const savedAmount = currentSavedAmount + todaySavedAmount
				const deadline = this.normalizePlanDeadline(this.editingPlan.deadline)

				if (!name) {
					uni.showToast({ title: '请输入计划名称', icon: 'none' })
					return
				}
				if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
					uni.showToast({ title: '请输入正确的目标金额', icon: 'none' })
					return
				}
				if (!deadline) {
					uni.showToast({ title: '请选择目标完成日期', icon: 'none' })
					return
				}
				if (deadline < this.getTodayDate()) {
					uni.showToast({ title: '目标完成日期不能早于今天', icon: 'none' })
					return
				}
				if (!Number.isFinite(todaySavedAmount) || todaySavedAmount < 0) {
					uni.showToast({ title: '请输入正确的今日攒入金额', icon: 'none' })
					return
				}
				if (!Number.isFinite(savedAmount) || savedAmount < 0 || savedAmount > targetAmount) {
					uni.showToast({ title: '累计已攒金额不能超过目标金额', icon: 'none' })
					return
				}

				const plan = {
					...this.editingPlan,
					name,
					targetAmount,
					savedAmount,
					deadline
				}
				if (this.editingIndex === -1) {
					plan.id = Date.now()
					this.plans.unshift(plan)
				} else {
					this.plans.splice(this.editingIndex, 1, plan)
				}
				this.plans = this.sortPlansByStatus(this.plans)

				uni.setStorageSync('savings_plan', this.plans)
				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					try {
						await saveUserConfig(`${phone}SavingsPlan`, JSON.stringify(this.plans), '哆米记账攒钱计划')
					} catch (error) {
						uni.showToast({ title: '计划已本地保存', icon: 'none' })
					}
				}
				this.closePlanEditor()
				uni.showToast({ title: '计划已保存', icon: 'success' })
			}
		}
	}
</script>

<style>
	.objective-page {
		padding-bottom: 190rpx;
	}

	.saving-overview {
		position: relative;
		margin-top: 34rpx;
		padding: 34rpx 36rpx 28rpx;
		border-radius: 42rpx;
		background: linear-gradient(135deg, #143a55 0%, #2c556f 58%, #4a8b79 100%);
		box-shadow: 0 22rpx 52rpx rgba(13, 40, 57, 0.2);
		color: #fbf8f2;
		overflow: hidden;
	}

	.saving-overview::after {
		content: '';
		position: absolute;
		right: -70rpx;
		top: -92rpx;
		width: 260rpx;
		height: 260rpx;
		border-radius: 999rpx;
		background: radial-gradient(circle, rgba(232, 180, 188, 0.3), transparent 68%);
	}

	.saving-overview-copy,
	.overview-progress,
	.overview-footer {
		position: relative;
		z-index: 1;
	}

	.overview-eyebrow,
	.overview-amount,
	.overview-target,
	.overview-footer text {
		display: block;
	}

	.overview-eyebrow {
		font-size: 22rpx;
		letter-spacing: 3rpx;
		color: rgba(251, 248, 242, 0.62);
	}

	.overview-amount {
		margin-top: 12rpx;
		font-size: 62rpx;
		font-weight: 800;
		line-height: 1;
	}

	.overview-target {
		margin-top: 16rpx;
		font-size: 23rpx;
		color: rgba(251, 248, 242, 0.72);
	}

	.saving-shell {
		position: absolute;
		right: 34rpx;
		top: 30rpx;
		z-index: 1;
		width: 118rpx;
		height: 118rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.12);
	}

	.saving-shell image {
		display: block;
		width: 100%;
		height: 100%;
	}

	.overview-progress {
		margin-top: 36rpx;
		height: 14rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.18);
		overflow: hidden;
	}

	.overview-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: #f0c2a9;
	}

	.overview-footer {
		display: flex;
		justify-content: space-between;
		gap: 20rpx;
		margin-top: 18rpx;
		font-size: 22rpx;
		color: rgba(251, 248, 242, 0.68);
	}

	.plan-more {
		display: flex;
		align-items: center;
		gap: 6rpx;
		font-size: 23rpx;
		color: #7e8896;
	}

	.plan-more text:last-child {
		font-size: 30rpx;
		line-height: 1;
	}

	.plan-create-fab {
		position: fixed;
		right: 44rpx;
		bottom: calc(54rpx + var(--app-safe-bottom, env(safe-area-inset-bottom)));
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 12rpx;
		height: 88rpx;
		padding: 0 32rpx 0 18rpx;
		border-radius: 999rpx;
		background: #143a55;
		box-shadow: 0 18rpx 42rpx rgba(13, 40, 57, 0.24);
		color: #fff;
		font-size: 26rpx;
		font-weight: 800;
		box-sizing: border-box;
	}

	.plan-create-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56rpx;
		height: 56rpx;
		border-radius: 999rpx;
		background: rgba(191, 224, 210, 0.2);
	}

	.plan-create-icon text {
		font-size: 36rpx;
		line-height: 1;
	}

	.plan-editor-mask {
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

	.plan-editor-panel {
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
	.editor-label {
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

	.editor-field {
		margin-top: 24rpx;
	}

	.editor-label {
		margin-bottom: 10rpx;
		font-size: 23rpx;
		font-weight: 700;
		color: #52606c;
	}

	.editor-input,
	.editor-money-input {
		box-sizing: border-box;
		width: 100%;
		height: 82rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 18rpx;
		background: #f7f2e8;
		font-size: 27rpx;
		font-weight: 600;
		color: #1a2530;
	}

	.editor-input {
		padding: 0 22rpx;
	}

	.editor-date-wrap {
		display: flex;
		align-items: center;
		width: 100%;
		height: 82rpx;
		padding: 0 20rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 18rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.editor-date-wrap .time-picker {
		flex: 1;
		justify-content: flex-end;
		min-width: 0;
		height: 70rpx;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		font-size: 26rpx;
		font-weight: 700;
		color: #1a2530;
	}

	.editor-money-input {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding-left: 22rpx;
	}

	.editor-money-input > text {
		font-size: 28rpx;
		font-weight: 800;
		color: #143a55;
	}

	.editor-money-input .editor-input {
		height: 80rpx;
		padding-left: 0;
		border: 0;
		background: transparent;
	}

	.editor-actions {
		display: flex;
		gap: 18rpx;
		margin-top: 30rpx;
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

	@media screen and (min-width: 768px) {
		.plan-create-fab {
			right: calc(50% - 187px);
		}
	}
</style>
