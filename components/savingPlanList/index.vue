<template>
	<view class="saving-plan-list">
		<template v-if="plans.length">
			<view
				v-for="(item, index) in plans"
				:key="getPlanKey(item, index)"
				class="plan-swipe"
				:class="{ active: activeSwipeIndex === index }"
			>
				<view
					class="plan-swipe-delete"
					:class="{ deleting: deletingPlanId === item.id }"
					@tap.stop="confirmDelete(item, index)"
				>
					<text>{{ deletingPlanId === item.id ? '删除中' : '删除' }}</text>
				</view>
				<view
					class="plan-card"
					@touchstart="handleSwipeTouchStart(index, $event)"
					@touchmove="handleSwipeTouchMove(index, $event)"
					@touchend="handleSwipeTouchEnd(index, $event)"
					@tap="handlePlanTap(item, index)"
				>
					<view class="plan-card-head">
						<view class="plan-icon" :class="item.tone">
							<image :src="item.iconPath" mode="aspectFit"></image>
						</view>
						<view class="plan-title-wrap">
							<text class="plan-name">{{ item.name }}</text>
							<text class="plan-deadline">{{ getDeadlineLine(item) }}</text>
						</view>
						<view v-if="displayMode === 'archive'" class="plan-status" :class="isPlanCompleted(item) ? 'completed' : 'failed'">
							<text>{{ isPlanCompleted(item) ? '已完成' : '已失败' }}</text>
						</view>
						<text v-else class="plan-percent">{{ getPlanProgress(item) }}%</text>
					</view>
					<view class="plan-amount-row">
						<text class="plan-saved">¥{{ formatAmount(item.savedAmount) }}</text>
						<text class="plan-target">/ ¥{{ formatAmount(item.targetAmount) }}</text>
						<text v-if="displayMode === 'archive'" class="plan-percent">{{ getPlanProgress(item) }}%</text>
					</view>
					<view class="bd-progress plan-progress">
						<view class="bd-progress-fill" :class="item.tone" :style="{ width: getPlanProgress(item) + '%' }"></view>
					</view>
					<view v-if="displayMode === 'archive'" class="plan-card-footer">
						<text>{{ isPlanCompleted(item) ? '目标已完成' : '目标已失败' }}</text>
					</view>
				</view>
			</view>
		</template>
		<view v-else class="empty-data">
			<text>{{ emptyText }}</text>
		</view>
	</view>
</template>

<script>
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	export default {
		name: 'SavingPlanList',
		props: {
			plans: {
				type: Array,
				default: () => []
			},
			displayMode: {
				type: String,
				default: 'active'
			},
			emptyText: {
				type: String,
				default: '暂无数据'
			},
			deletingPlanId: {
				default: ''
			}
		},
		data() {
			return {
				activeSwipeIndex: -1,
				swipeState: {
					index: -1,
					startX: 0,
					startY: 0,
					isSwiping: false
				},
				suppressNextTap: false
			}
		},
		watch: {
			plans() {
				if (this.activeSwipeIndex >= this.plans.length) this.activeSwipeIndex = -1
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
			normalizePlanDeadline(value) {
				const text = String(value || '')
				const fullMatch = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/)
				if (fullMatch) return `${fullMatch[1]}-${this.padDate(fullMatch[2])}-${this.padDate(fullMatch[3])}`

				const monthMatch = text.match(/(\d{4})[-/年](\d{1,2})/)
				if (monthMatch) return `${monthMatch[1]}-${this.padDate(monthMatch[2])}-01`
				return ''
			},
			getPlanKey(item, index) {
				return String((item && item.id) || 'plan') + '-' + index
			},
			deadlineLabel(item) {
				return this.displayMode === 'archive' ? '目标日期' : '距离'
			},
			getDeadlineLine(item) {
				const deadlineText = `${this.deadlineLabel(item)} ${this.getPlanDeadlineText(item.deadline)}`
				if (this.displayMode !== 'active') return deadlineText
				return `${deadlineText} · ${this.getPlanRemainingDaysText(item.deadline)}`
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
				const deadlineDate = new Date(Number(year), Number(month) - 1, Number(day))
				const now = new Date()
				const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
				const remainingDays = Math.round((deadlineDate - todayDate) / 86400000)

				if (remainingDays > 0) return `还剩${remainingDays}天`
				if (remainingDays === 0) return '今日到期'
				return `已过期${Math.abs(remainingDays)}天`
			},
			getPlanProgress(item) {
				const target = Number(item && item.targetAmount || 0)
				if (!target) return 0
				return Math.min(Math.round((Number(item.savedAmount || 0) / target) * 100), 100)
			},
			isPlanCompleted(item) {
				return Number(item.savedAmount || 0) >= Number(item.targetAmount || 0)
			},
			getTouchPoint(event) {
				return (event && event.touches && event.touches[0]) || (event && event.changedTouches && event.changedTouches[0]) || {}
			},
			handleSwipeTouchStart(index, event) {
				if (this.deletingPlanId) return
				if (this.activeSwipeIndex !== -1 && this.activeSwipeIndex !== index) this.activeSwipeIndex = -1

				const point = this.getTouchPoint(event)
				this.swipeState = { index, startX: Number(point.clientX || 0), startY: Number(point.clientY || 0), isSwiping: false }
			},
			handleSwipeTouchMove(index, event) {
				if (this.swipeState.index !== index || this.deletingPlanId) return

				const point = this.getTouchPoint(event)
				const deltaX = Number(point.clientX || 0) - this.swipeState.startX
				const deltaY = Number(point.clientY || 0) - this.swipeState.startY
				if (!this.swipeState.isSwiping) {
					if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return
					if (Math.abs(deltaX) <= Math.abs(deltaY)) {
						this.swipeState.index = -1
						return
					}
					this.swipeState.isSwiping = true
					this.suppressNextTap = true
				}

				if (deltaX < -10) this.activeSwipeIndex = index
				else if (deltaX > 10) this.activeSwipeIndex = -1
			},
			handleSwipeTouchEnd(index) {
				if (this.swipeState.index !== index) return
				this.swipeState = { index: -1, startX: 0, startY: 0, isSwiping: false }
				if (this.suppressNextTap) setTimeout(() => { this.suppressNextTap = false }, 300)
			},
			handlePlanTap(item, index) {
				if (this.suppressNextTap) return
				if (this.activeSwipeIndex === index) {
					this.activeSwipeIndex = -1
					return
				}
				if (this.displayMode === 'active') this.$emit('planTap', item, index)
			},
			confirmDelete(item, index) {
				if (this.deletingPlanId || !item) return
				this.activeSwipeIndex = -1
				this.suppressNextTap = false
				uni.showModal({
					title: '删除计划',
					content: `是否确定删除“${item.name}”这个计划？`,
					confirmText: '确定',
					confirmColor: '#c97b86',
					success: (result) => {
						if (result.confirm) this.$emit('delete', item, index)
					}
				})
			}
		}
	}
</script>

<style>
	.saving-plan-list {
		display: grid;
		gap: 18rpx;
	}

	.plan-swipe {
		position: relative;
		overflow: hidden;
		border-radius: 28rpx;
		box-shadow: 0 12rpx 34rpx rgba(20, 58, 85, 0.06);
	}

	.plan-swipe-delete {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 128rpx;
		background: #c97b86;
		color: #fff;
		font-size: 24rpx;
		font-weight: 700;
		visibility: hidden;
	}

	.plan-swipe.active .plan-swipe-delete { visibility: visible; }
	.plan-swipe-delete.deleting { opacity: 0.66; }

	.plan-card {
		position: relative;
		z-index: 2;
		padding: 28rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: #fff;
		transition: transform 0.18s ease;
		touch-action: pan-y;
		box-sizing: border-box;
	}

	.plan-swipe.active .plan-card { transform: translateX(-128rpx); }
	.plan-card-head,
	.plan-amount-row,
	.plan-card-footer { display: flex; align-items: center; }
	.plan-card-head { gap: 18rpx; }

	.plan-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		flex: 0 0 72rpx;
		border-radius: 23rpx;
	}
	.plan-icon image { width: 40rpx; height: 40rpx; }
	.plan-title-wrap { flex: 1; min-width: 0; }
	.plan-name, .plan-deadline, .plan-saved, .plan-target, .plan-card-footer text { display: block; }
	.plan-name { font-size: 29rpx; font-weight: 800; color: #1a2530; }
	.plan-deadline { margin-top: 7rpx; font-size: 21rpx; color: #7e8896; }
	.plan-percent { font-size: 30rpx; font-weight: 800; color: #143a55; }
	.plan-amount-row { margin-top: 24rpx; align-items: baseline; gap: 8rpx; }
	.plan-saved { font-size: 36rpx; font-weight: 800; color: #143a55; }
	.plan-target { font-size: 23rpx; color: #7e8896; }
	.plan-progress { margin-top: 16rpx; }
	.plan-status { flex: 0 0 auto; padding: 10rpx 16rpx; border-radius: 999rpx; font-size: 21rpx; font-weight: 700; }
	.plan-status.completed { background: rgba(74, 139, 121, 0.12); color: #4a8b79; }
	.plan-status.failed { background: rgba(201, 123, 134, 0.12); color: #c97b86; }
	.plan-card-footer { margin-top: 16rpx; font-size: 21rpx; color: #7e8896; }
	.empty-data { margin-top: 18rpx; padding: 64rpx 24rpx; border-radius: 24rpx; background: rgba(255, 255, 255, 0.72); font-size: 24rpx; text-align: center; color: #9aa2ab; }
</style>
