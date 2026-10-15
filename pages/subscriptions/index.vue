<template>
	<view class="bd-page subscriptions-page" :class="themeClass" :style="pageHeightStyle">
		<go-back fallback-url="/pages/home/index" fallback-mode="reLaunch" />
		<page-top eyebrow="SUBSCRIPTION CALENDAR" title="自动扣费" subtitle="按时查看已有订阅的金额与扣费安排。" />

		<view class="subs-summary">
			<view class="summary-top"><view><text>月度订阅总支出</text><text><small>¥</small>{{ formatAmount(monthlyTotal) }}</text><text>按扣费日自动聚合</text></view><view><text>年度预估</text><text>¥{{ formatAmount(monthlyTotal * 12) }}</text></view></view>
			<view class="summary-stats"><view><text>订阅项目</text><text>{{ subscriptions.length }} 项</text></view><view><text>近 2 周扣费</text><text>¥{{ formatAmount(upcomingAmount) }}</text></view></view>
		</view>

		<item-header title="订阅清单" />
		<view class="subscription-groups">
			<view v-for="group in groupedSubscriptions" :key="group.name" class="sub-group">
				<text class="sub-group-title">{{ group.name }} · {{ group.items.length }} 项</text>
				<view class="sub-list">
					<view v-for="item in group.items" :key="item.id" class="sub-swipe" :class="{ active: activeSwipeId === item.id }">
						<view class="sub-swipe-delete" :class="{ loading: saving }" @tap.stop="cancelSubscription(item)">{{ saving ? '处理中' : '删除' }}</view>
						<view
							class="sub-item"
							@touchstart="handleSwipeTouchStart(item.id, $event)"
							@touchmove="handleSwipeTouchMove(item.id, $event)"
							@touchend="handleSwipeTouchEnd(item.id)"
							@tap="handleSubscriptionTap(item)"
						>
							<view class="sub-icon"><image src="/static/images/icon_subscriptions.png" mode="aspectFit"></image></view>
							<view class="sub-info"><text>{{ item.name }}</text><text>{{ getDayLabel(item.day) }} 扣费 · {{ getFrequencyLabel(item.frequency) }}<text v-if="isUpcoming(item)" class="soon"> · 近 2 周</text></text></view>
							<view class="sub-right"><text>¥{{ formatAmount(item.amount) }}<small>/{{ getFrequencySuffix(item.frequency) }}</small></text></view>
						</view>
					</view>
				</view>
			</view>
			<view v-if="!subscriptions.length" class="empty-data"><text>还没有订阅，添加后就能看到每月支出</text></view>
		</view>

		<view class="add-sub-button" @tap="openEditor"><text>＋</text><text>添加订阅</text></view>
		<view v-if="showEditor" class="editor-mask" @tap="closeEditor" @touchmove.stop.prevent>
			<view class="editor-panel" @tap.stop @touchmove.stop>
				<text class="editor-title">{{ editingId ? '编辑订阅' : '添加订阅' }}</text>
				<view class="editor-field">
					<text>订阅名称</text>
					<input v-model="draft.name" maxlength="20" placeholder="例如：视频会员、云盘" />
				</view>
				<view class="editor-row">
					<view class="editor-field">
						<text>金额（元）</text>
						<input v-model="draft.amount" type="digit" maxlength="10" placeholder="0" />
					</view>
					<view class="editor-field">
						<text>分组</text>
						<picker class="editor-picker" :range="groupOptions" :value="groupIndex" @change="handleGroupChange">
							<view class="picker-value">
								<text class="picker-label">{{ groupOptions[groupIndex] }}</text>
								<view class="picker-arrow"></view>
							</view>
						</picker>
					</view>
				</view>
				<view class="editor-field">
					<text>扣费日</text>
					<picker class="editor-picker" :range="dayOptions" :value="dayIndex" @change="handleDayChange">
						<view class="picker-value">
							<text class="picker-label">{{ dayOptions[dayIndex] }}</text>
							<view class="picker-arrow"></view>
						</view>
					</picker>
				</view>
				<view class="editor-field">
					<text>使用频率</text>
					<picker class="editor-picker" :range="frequencyOptions" :value="frequencyIndex" @change="handleFrequencyChange">
						<view class="picker-value">
							<text class="picker-label">{{ frequencyOptions[frequencyIndex] }}</text>
							<view class="picker-arrow"></view>
						</view>
					</picker>
				</view>
				<view class="preview-box"><text>计入月度支出</text><text>¥{{ formatAmount(Number(draft.amount || 0) / (frequencyOptionsValues[frequencyIndex] || 1)) }}/月</text></view>
				<view class="editor-actions"><view @tap="closeEditor">取消</view><view @tap="saveSubscription">{{ editingId ? '保存' : '添加' }}</view></view>
			</view>
		</view>
		<view v-if="showCancelDialog" class="cancel-dialog-mask" @tap="closeCancelDialog" @touchmove.stop.prevent>
			<view class="cancel-dialog-panel" @tap.stop @touchmove.stop>
				<text class="cancel-dialog-title">删除订阅记录</text>
				<text class="cancel-dialog-subtitle">确定删除“{{ pendingCancelItem ? pendingCancelItem.name : '' }}”吗？这里只会移除记账记录，不会取消对应平台的实际订阅。</text>
				<view class="cancel-dialog-actions">
					<view class="cancel-dialog-button cancel" @tap="closeCancelDialog">取消</view>
					<view class="cancel-dialog-button confirm" :class="{ loading: saving }" @tap="confirmCancelSubscription">{{ saving ? '处理中…' : '删除' }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { getStoredPhone, getUserConfig, readJsonConfig, saveUserConfig } from '@/api/index.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'
	import { getSubscriptionChargeAmount, getNextSubscriptionChargeDate, getSubscriptionDayLabel, getSubscriptionFrequencyLabel, getSubscriptionFrequencySuffix, getSubscriptionMonthlyAmount, isSubscriptionChargeUpcoming, normalizeSubscriptions, SUBSCRIPTION_CONFIG_SUFFIX, SUBSCRIPTION_GROUPS, SUBSCRIPTION_FREQUENCIES, SUBSCRIPTION_STORAGE_KEY } from '@/common/subscription.js'

	export default {
		components: { PageTop, ItemHeader, GoBack },
		data() { return { subscriptions: [], showEditor: false, showCancelDialog: false, editingId: '', saving: false, pendingCancelItem: null, activeSwipeId: '', swipeState: { id: '', startX: 0, startY: 0, isSwiping: false }, suppressNextTap: false, groupIndex: 0, dayIndex: 0, frequencyIndex: 0, draft: { name: '', amount: '' }, groupOptions: SUBSCRIPTION_GROUPS.map((item) => item.name), dayOptions: ['每月 1 日', '每月 5 日', '每月 10 日', '每月 15 日', '每月 20 日', '每月 25 日', '每月 30 日', '每月最后一天'], dayValues: [1, 5, 10, 15, 20, 25, 30, 'last'], frequencyOptions: SUBSCRIPTION_FREQUENCIES.map((item) => item.label), frequencyOptionsValues: SUBSCRIPTION_FREQUENCIES.map((item) => item.value) } },
		computed: {
			monthlyTotal() { return this.subscriptions.reduce((sum, item) => sum + getSubscriptionMonthlyAmount(item), 0) },
			upcomingSubscriptions() { return this.subscriptions.filter((item) => this.isUpcoming(item)) },
			upcomingAmount() { return this.upcomingSubscriptions.reduce((sum, item) => sum + getSubscriptionChargeAmount(item), 0) },
			groupedSubscriptions() { return SUBSCRIPTION_GROUPS.map((group) => ({ ...group, items: this.subscriptions.filter((item) => item.group === group.name) })).filter((group) => group.items.length) }
		},
		onShow() { this.loadSubscriptions() },
		methods: {
			formatAmount(value) { return formatDisplayAmount(value) },
			async loadSubscriptions() {
				const localSubscriptions = normalizeSubscriptions(uni.getStorageSync(SUBSCRIPTION_STORAGE_KEY))
				this.subscriptions = localSubscriptions

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const remoteConfig = await getUserConfig(`${phone}${SUBSCRIPTION_CONFIG_SUFFIX}`)
					const remoteSubscriptions = normalizeSubscriptions(readJsonConfig(remoteConfig, []))
					this.subscriptions = remoteSubscriptions
					uni.setStorageSync(SUBSCRIPTION_STORAGE_KEY, remoteSubscriptions)
				} catch (error) {
					// Keep locally saved subscriptions when the remote configuration is unavailable.
				}
			},
			async persistSubscriptions() {
				uni.setStorageSync(SUBSCRIPTION_STORAGE_KEY, this.subscriptions)

				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					await saveUserConfig(`${phone}${SUBSCRIPTION_CONFIG_SUFFIX}`, JSON.stringify(this.subscriptions), '哆米记账订阅管理')
				}
			},
			getDayLabel(value) { return getSubscriptionDayLabel(value) },
			getFrequencyLabel(value) { return getSubscriptionFrequencyLabel(value) },
			getFrequencySuffix(value) { return getSubscriptionFrequencySuffix(value) },
			isUpcoming(item) { return isSubscriptionChargeUpcoming(item) },
			getNextChargeDate(item) {
				return getNextSubscriptionChargeDate(item)
			},
			openEditor(item = null) {
				this.activeSwipeId = ''
				this.suppressNextTap = false
				this.editingId = item ? item.id : ''
				this.draft = item ? { name: item.name, amount: String(item.amount) } : { name: '', amount: '' }
				this.groupIndex = item ? Math.max(this.groupOptions.indexOf(item.group), 0) : 0
				this.dayIndex = item ? Math.max(this.dayValues.findIndex((value) => String(value) === String(item.day)), 0) : 0
				this.frequencyIndex = item ? Math.max(this.frequencyOptionsValues.indexOf(Number(item.frequency)), 0) : 0
				this.showEditor = true
			},
			closeEditor() { this.showEditor = false; this.editingId = '' },
			handleGroupChange(event) { this.groupIndex = Number(event.detail.value) || 0 },
			handleDayChange(event) { this.dayIndex = Number(event.detail.value) || 0 },
			handleFrequencyChange(event) { this.frequencyIndex = Number(event.detail.value) || 0 },
			async saveSubscription() {
				if (this.saving) return
				const name = String(this.draft.name || '').trim()
				const amount = Number(this.draft.amount)
				if (!name || !Number.isFinite(amount) || amount <= 0) { uni.showToast({ title: '请填写正确的订阅信息', icon: 'none' }); return }
				const existing = this.editingId ? this.subscriptions.find((item) => item.id === this.editingId) : null
				const record = { id: this.editingId || `sub_${Date.now()}`, name, amount, group: this.groupOptions[this.groupIndex], day: this.dayValues[this.dayIndex], frequency: this.frequencyOptionsValues[this.frequencyIndex], createdAt: existing && existing.createdAt ? existing.createdAt : new Date().toISOString(), used: existing ? existing.used !== false : true }
				const isEditing = Boolean(this.editingId)
				if (isEditing) {
					this.subscriptions = this.subscriptions.map((item) => item.id === this.editingId ? record : item)
				} else {
					this.subscriptions.push(record)
				}
				this.saving = true
				try {
					await this.persistSubscriptions()
					this.closeEditor()
					uni.showToast({ title: isEditing ? '订阅已更新' : '订阅已添加', icon: 'success' })
				} catch (error) {
					uni.showToast({ title: '订阅已本地保存', icon: 'none' })
				} finally {
					this.saving = false
				}
			},
			cancelSubscription(item) {
				if (this.saving || !item) return
				this.activeSwipeId = ''
				this.pendingCancelItem = item
				this.showCancelDialog = true
			},
			getTouchPoint(event) {
				return (event && event.touches && event.touches[0]) || (event && event.changedTouches && event.changedTouches[0]) || {}
			},
			handleSwipeTouchStart(id, event) {
				if (this.saving) return
				if (this.activeSwipeId && this.activeSwipeId !== id) this.activeSwipeId = ''

				const point = this.getTouchPoint(event)
				this.swipeState = { id, startX: Number(point.clientX || 0), startY: Number(point.clientY || 0), isSwiping: false }
			},
			handleSwipeTouchMove(id, event) {
				if (this.saving || this.swipeState.id !== id) return

				const point = this.getTouchPoint(event)
				const deltaX = Number(point.clientX || 0) - this.swipeState.startX
				const deltaY = Number(point.clientY || 0) - this.swipeState.startY
				if (!this.swipeState.isSwiping) {
					if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return
					if (Math.abs(deltaX) <= Math.abs(deltaY)) {
						this.swipeState.id = ''
						return
					}
					this.swipeState.isSwiping = true
					this.suppressNextTap = true
				}

				if (deltaX < -10) this.activeSwipeId = id
				else if (deltaX > 10) this.activeSwipeId = ''
			},
			handleSwipeTouchEnd(id) {
				if (this.swipeState.id !== id) return
				this.swipeState = { id: '', startX: 0, startY: 0, isSwiping: false }
				if (this.suppressNextTap) setTimeout(() => { this.suppressNextTap = false }, 300)
			},
			handleSubscriptionTap(item) {
				if (this.suppressNextTap) return
				if (this.activeSwipeId === item.id) {
					this.activeSwipeId = ''
					return
				}
				this.openEditor(item)
			},
			closeCancelDialog() {
				if (this.saving) return
				this.showCancelDialog = false
				this.pendingCancelItem = null
			},
			confirmCancelSubscription() {
				if (!this.pendingCancelItem) return
				this.removeSubscription(this.pendingCancelItem)
			},
			async removeSubscription(item) {
				if (this.saving) return
				this.subscriptions = this.subscriptions.filter((entry) => entry.id !== item.id)
				this.saving = true
				try {
					await this.persistSubscriptions()
					this.showCancelDialog = false
					this.pendingCancelItem = null
					uni.showToast({ title: '已删除', icon: 'success' })
				} catch (error) {
					uni.showToast({ title: '删除记录已本地保存', icon: 'none' })
				} finally {
					this.saving = false
				}
			}
		}
	}
</script>

<style>
	.subscriptions-page { padding-bottom: 150rpx; }
	.subs-summary { margin-top: 34rpx; padding: 28rpx 26rpx 22rpx; border: 1rpx solid rgba(20, 58, 85, 0.08); border-radius: 30rpx; background: rgba(255, 255, 255, 0.82); box-shadow: 0 14rpx 36rpx rgba(20, 58, 85, 0.07); }
	.summary-top, .summary-stats { display: flex; gap: 14rpx; }
	.summary-top { align-items: stretch; justify-content: space-between; }
	.summary-top > view:first-child { flex: 1; min-width: 0; padding: 24rpx; border-radius: 22rpx; background: #143a55; color: #fbf8f2; }
	.summary-top > view:last-child { flex: 0 0 154rpx; min-width: 0; padding: 24rpx 18rpx; border-radius: 22rpx; background: #f8e9df; color: #7b5648; box-sizing: border-box; }
	.summary-top text, .summary-stats text { display: block; }
	.summary-top text:first-child, .summary-top text:last-child, .summary-stats text:first-child { font-size: 20rpx; opacity: 0.76; }
	.summary-top text:nth-child(2) { margin-top: 9rpx; font-size: 48rpx; font-weight: 800; line-height: 1.05; white-space: nowrap; }
	.summary-top small { font-size: 25rpx; }
	.summary-top > view:last-child text:nth-child(2) { font-size: 29rpx; white-space: normal; word-break: break-all; }
	.summary-top text:last-child { margin-top: 10rpx; }
	.summary-stats { margin-top: 18rpx; }
	.summary-stats > view { flex: 1; min-width: 0; padding: 14rpx 12rpx; border-radius: 16rpx; background: #f7f2e8; }
	.summary-stats text:first-child { color: #7e8896; }
	.summary-stats text:last-child { margin-top: 6rpx; font-size: 23rpx; font-weight: 800; color: #143a55; white-space: nowrap; }
	.subscription-groups { display: grid; gap: 20rpx; }
	.sub-group-title { display: block; margin: 0 4rpx 10rpx; font-size: 22rpx; font-weight: 700; color: #52606c; }
	.sub-list { padding: 4rpx 20rpx; border: 1rpx solid rgba(20, 58, 85, 0.08); border-radius: 24rpx; background: rgba(255, 255, 255, 0.82); box-shadow: 0 10rpx 28rpx rgba(20, 58, 85, 0.04); }
	.sub-swipe { position: relative; overflow: hidden; border-bottom: 1rpx solid rgba(20, 58, 85, 0.08); }
	.sub-swipe:last-child { border-bottom: 0; }
	.sub-swipe-delete { position: absolute; right: 0; top: 0; bottom: 0; z-index: 1; display: flex; align-items: center; justify-content: center; width: 128rpx; background: #c97b86; color: #fff; font-size: 24rpx; font-weight: 700; opacity: 0; pointer-events: none; transform: translateX(100%); transition: opacity 0.18s ease, transform 0.18s ease; }
	.sub-swipe-delete.loading { opacity: 0.66; }
	.sub-swipe.active .sub-swipe-delete { opacity: 1; pointer-events: auto; transform: translateX(0); }
	.sub-item { position: relative; z-index: 2; display: flex; align-items: center; gap: 14rpx; min-width: 0; padding: 18rpx 0; background: transparent; transition: background-color 0.15s ease, transform 0.18s ease; touch-action: pan-y; }
	.sub-swipe.active .sub-item { transform: translate3d(-128rpx, 0, 0); }
	.sub-item:active { background: rgba(20, 58, 85, 0.05); }
	.sub-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 62rpx;
    height: 62rpx;
    flex: 0 0 62rpx;
    border-radius: 20rpx;
    background-color: #fbf4e9;
  }
	.sub-icon image {
    width: 38rpx;
    height: 38rpx;
  }
	.sub-info { flex: 1; min-width: 0; }
	.sub-info > text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sub-info > text:first-child { font-size: 26rpx; font-weight: 800; color: #1a2530; }
	.sub-info > text:last-child { margin-top: 6rpx; font-size: 20rpx; color: #7e8896; }
	.soon { color: #c97b86; }
	.sub-right { flex: 0 0 auto; text-align: right; }
	.sub-right > text { display: block; font-size: 25rpx; font-weight: 800; color: #1a2530; }
	.sub-right small { font-size: 19rpx; font-weight: 500; color: #7e8896; }
	.add-sub-button { position: fixed; right: 44rpx; bottom: calc(54rpx + var(--app-safe-bottom, env(safe-area-inset-bottom))); z-index: 40; display: flex; align-items: center; gap: 10rpx; height: 82rpx; padding: 0 26rpx 0 16rpx; border-radius: 999rpx; background: #143a55; color: #fff; box-shadow: 0 16rpx 34rpx rgba(20, 58, 85, 0.24); font-size: 25rpx; font-weight: 800; }
	.add-sub-button text:first-child { font-size: 34rpx; line-height: 1; }
	.empty-data { padding: 70rpx 24rpx; border-radius: 24rpx; background: rgba(255, 255, 255, 0.72); text-align: center; color: #9aa2ab; font-size: 24rpx; }
	.editor-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; padding: 24rpx 24rpx calc(24rpx + var(--app-safe-bottom, env(safe-area-inset-bottom))); background: rgba(13, 40, 57, 0.38); box-sizing: border-box; }
	.editor-panel { width: 100%; max-height: calc(var(--app-window-height, 100vh) - 48rpx); padding: 34rpx 28rpx 26rpx; border-radius: 30rpx; background: #fffdf8; box-sizing: border-box; overflow-y: auto; }
	.editor-title { display: block; font-size: 32rpx; font-weight: 800; color: #143a55; }
	.editor-row { display: flex; gap: 14rpx; }
	.editor-row .editor-field { flex: 1; min-width: 0; }
	.editor-field { min-width: 0; margin-top: 22rpx; }
	.editor-field > text { display: block; margin-bottom: 9rpx; font-size: 22rpx; font-weight: 700; color: #52606c; }
	.editor-field input, .picker-value { width: 100%; height: 76rpx; padding: 0 18rpx; border: 1rpx solid rgba(20, 58, 85, 0.12); border-radius: 16rpx; background: #f7f2e8; box-sizing: border-box; font-size: 25rpx; color: #1a2530; }
	.editor-picker { display: block; width: 100%; min-width: 0; }
	.picker-value { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; line-height: normal; white-space: nowrap; overflow: hidden; }
	.picker-label { display: block; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a2530; }
	.picker-arrow { width: 12rpx; height: 12rpx; flex: 0 0 12rpx; border-right: 3rpx solid #9aa2ab; border-bottom: 3rpx solid #9aa2ab; box-sizing: border-box; transform: rotate(45deg) translate(-2rpx, -2rpx); }
	.preview-box { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-top: 22rpx; padding: 18rpx; border-radius: 16rpx; background: #d5e8e8; color: #3b6e89; font-size: 22rpx; font-weight: 700; }
	.preview-box text:first-child { min-width: 0; }
	.preview-box text:last-child { flex: 0 0 auto; font-size: 28rpx; }
	.editor-actions { display: flex; gap: 14rpx; margin-top: 28rpx; }
	.editor-actions view { flex: 1; height: 76rpx; border-radius: 16rpx; line-height: 76rpx; text-align: center; font-size: 26rpx; font-weight: 700; }
	.editor-actions view:first-child { background: #f1eee7; color: #66727c; }
	.editor-actions view:last-child { background: #143a55; color: #fff; }
	.cancel-dialog-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 110; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(13, 40, 57, 0.38); box-sizing: border-box; }
	.cancel-dialog-panel { width: 100%; max-width: 620rpx; padding: 42rpx 36rpx 30rpx; border-radius: 30rpx; background: #fffdf8; box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2); box-sizing: border-box; }
	.cancel-dialog-title, .cancel-dialog-subtitle { display: block; }
	.cancel-dialog-title { font-size: 34rpx; font-weight: 800; color: #1a2530; }
	.cancel-dialog-subtitle { margin-top: 14rpx; font-size: 24rpx; line-height: 1.7; color: #7e8896; }
	.cancel-dialog-actions { display: flex; gap: 18rpx; margin-top: 30rpx; }
	.cancel-dialog-button { flex: 1; height: 76rpx; border-radius: 18rpx; text-align: center; font-size: 27rpx; font-weight: 700; line-height: 76rpx; }
	.cancel-dialog-button.cancel { background: #f1eee7; color: #66727c; }
	.cancel-dialog-button.confirm { background: #143a55; color: #fff; }
	.cancel-dialog-button.confirm.loading { opacity: 0.66; }
</style>
