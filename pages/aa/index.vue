<template>
	<view class="bd-page aa-page" :class="themeClass" :style="pageHeightStyle">
		<go-back fallback-url="/pages/home/index" fallback-mode="reLaunch" />
		<page-top eyebrow="SHARED EXPENSES" title="共同分账" subtitle="按参与人数记录共同支出，并跟进支付进度。" />

		<view class="aa-summary">
			<view><text>进行中分账</text><text>{{ ongoingRecords.length }} 笔</text></view>
			<view><text>待收金额</text><text>¥{{ formatAmount(pendingAmount) }}</text></view>
		</view>

		<view class="aa-tabs"><view :class="{ active: activeTab === 'ongoing' }" @tap="activeTab = 'ongoing'">进行中 {{ ongoingRecords.length }}</view><view :class="{ active: activeTab === 'settled' }" @tap="activeTab = 'settled'">已结算 {{ settledRecords.length }}</view></view>
		<view class="aa-list">
				<view v-for="item in visibleRecords" :key="item.id" class="aa-card">
					<view class="aa-card-head">
            <view class="aa-icon tone-violet"><image src="/static/images/icon_aa.png" mode="aspectFit"></image></view>
            <view class="aa-title-wrap">
              <text>{{ item.name }}</text>
              <text>{{ item.peopleCount }} 人参与 · 人均 ¥{{ formatAmount(item.totalAmount / item.peopleCount) }}</text>
            </view>
            <view v-if="activeTab === 'ongoing'" class="aa-edit" @tap.stop="openEditor(item)"><image src="/static/images/icon_edit.png" mode="aspectFit"></image></view>
            <view class="aa-del" @tap.stop="confirmDelete(item)"><image src="/static/images/icon_del.png" mode="aspectFit"></image></view>
          </view>
					<view class="aa-amount-row"><text>总金额</text><text>¥{{ formatAmount(item.totalAmount) }}</text></view>
					<view class="aa-progress"><view class="aa-progress-fill" :style="{ width: Math.round((item.paidCount / item.peopleCount) * 100) + '%' }"></view></view>
					<view class="aa-card-footer">
            <text>{{ item.paidCount }}/{{ item.peopleCount }} 已付</text>
            <view class="aa-card-actions">
              <view v-if="item.paidCount < item.peopleCount" class="aa-pay-button" @tap.stop="markPaid(item)">标记一人已付</view>
            </view>
          </view>
			</view>
			<view v-if="!visibleRecords.length" class="empty-data"><text>{{ activeTab === 'ongoing' ? '暂无进行中的分账' : '暂无已结算分账' }}</text></view>
		</view>

		<view class="aa-create-button" @tap="openEditor"><text>＋</text><text>新建分账</text></view>
		<view v-if="showEditor" class="editor-mask" @tap="closeEditor" @touchmove.stop.prevent><view class="editor-panel" @tap.stop @touchmove.stop><text class="editor-title">{{ editingId ? '编辑 AA 分账' : '新建 AA 分账' }}</text><view class="editor-field"><text>事项名称</text><input v-model="draft.name" maxlength="20" placeholder="例如：周五聚餐" /></view><view class="editor-field"><text>总金额</text><input v-model="draft.totalAmount" type="digit" maxlength="10" placeholder="请输入总金额" /></view><view class="editor-field"><text>参与人数</text><input v-model="draft.peopleCount" type="number" maxlength="3" placeholder="请输入参与人数" /></view><view class="editor-actions"><view @tap="closeEditor">取消</view><view @tap="saveRecord">保存</view></view></view></view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { getStoredPhone, getUserConfig, readJsonConfig, saveUserConfig } from '@/api/index.js'
	import { AA_SPLIT_CONFIG_SUFFIX, AA_SPLIT_STORAGE_KEY, getAaOngoingRecords, getAaSettledRecords, normalizeAaRecords } from '@/common/aaSplit.js'
	import { formatAmount as formatDisplayAmount } from '@/common/format.js'

	export default {
		components: { PageTop, GoBack },
		data() { return { records: [], activeTab: 'ongoing', showEditor: false, editingId: '', saving: false, draft: { name: '', totalAmount: '', peopleCount: 2 } } },
		computed: {
			ongoingRecords() { return getAaOngoingRecords(this.records) },
			settledRecords() { return getAaSettledRecords(this.records) },
			visibleRecords() { return this.activeTab === 'ongoing' ? this.ongoingRecords : this.settledRecords },
			pendingAmount() { return this.ongoingRecords.reduce((sum, item) => sum + (item.totalAmount / item.peopleCount) * (item.peopleCount - item.paidCount), 0) }
		},
		onShow() { this.loadRecords() },
		methods: {
			formatAmount(value) { return formatDisplayAmount(value) },
			async loadRecords() {
				const localRecords = normalizeAaRecords(uni.getStorageSync(AA_SPLIT_STORAGE_KEY))
				this.records = localRecords

				const phone = getStoredPhone()
				if (!phone || !uni.getStorageSync('App-Token')) return

				try {
					const remoteConfig = await getUserConfig(`${phone}${AA_SPLIT_CONFIG_SUFFIX}`)
					const remoteRecords = normalizeAaRecords(readJsonConfig(remoteConfig, []))
					this.records = remoteRecords
					uni.setStorageSync(AA_SPLIT_STORAGE_KEY, remoteRecords)
				} catch (error) {
					// Keep locally saved records when the remote configuration is unavailable.
				}
			},
			async persistRecords() {
				uni.setStorageSync(AA_SPLIT_STORAGE_KEY, this.records)

				const phone = getStoredPhone()
				if (phone && uni.getStorageSync('App-Token')) {
					await saveUserConfig(`${phone}${AA_SPLIT_CONFIG_SUFFIX}`, JSON.stringify(this.records), '哆米记账AA分账')
				}
			},
			openEditor(item = null) {
				this.editingId = item ? item.id : ''
				this.draft = item
					? { name: item.name, totalAmount: String(item.totalAmount), peopleCount: item.peopleCount }
					: { name: '', totalAmount: '', peopleCount: 2 }
				this.showEditor = true
			},
			closeEditor() { this.showEditor = false; this.editingId = '' },
			async saveRecord() {
				if (this.saving) return
				const name = String(this.draft.name || '').trim()
				const totalAmount = Number(this.draft.totalAmount)
				const peopleCount = Math.floor(Number(this.draft.peopleCount))
				if (!name || !Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isInteger(peopleCount) || peopleCount < 2) {
					uni.showToast({ title: '请填写正确的分账信息', icon: 'none' }); return
				}
				const isEditing = Boolean(this.editingId)
				if (isEditing) {
					const target = this.records.find((item) => item.id === this.editingId)
					if (target) {
						target.name = name
						target.totalAmount = totalAmount
						target.peopleCount = peopleCount
						target.paidCount = Math.min(target.paidCount, peopleCount)
					}
				} else {
					this.records.unshift({ id: `aa_${Date.now()}`, name, totalAmount, peopleCount, paidCount: 0, createdAt: new Date().toISOString() })
				}
				this.saving = true
				try {
					await this.persistRecords()
					this.closeEditor()
					uni.showToast({ title: isEditing ? '分账已更新' : '分账已创建', icon: 'success' })
				} catch (error) {
					// uni.showToast({ title: '分账已本地保存', icon: 'none' })
				} finally {
					this.saving = false
				}
			},
			confirmDelete(item) {
				if (!item || this.saving) return
				uni.showModal({
					title: '删除分账',
					content: `确定删除“${item.name || '这笔分账'}”吗？`,
					confirmText: '确定',
					confirmColor: '#c97b86',
					success: (result) => {
						if (result.confirm) this.deleteRecord(item)
					}
				})
			},
			async deleteRecord(item) {
				if (!item || this.saving) return
				this.records = this.records.filter((record) => record.id !== item.id)
				this.saving = true
				try {
					await this.persistRecords()
					uni.showToast({ title: '已删除', icon: 'success' })
				} catch (error) {
					// uni.showToast({ title: '分账已本地删除', icon: 'none' })
				} finally {
					this.saving = false
				}
			},
			async markPaid(item) {
				if (this.saving) return
				const target = this.records.find((record) => record.id === item.id)
				if (!target || target.paidCount >= target.peopleCount) return
				target.paidCount += 1
				this.saving = true
				try {
					await this.persistRecords()
					uni.showToast({ title: target.paidCount >= target.peopleCount ? '分账已结算' : '已更新付款进度', icon: 'success' })
				} catch (error) {
					// uni.showToast({ title: '进度已本地保存', icon: 'none' })
				} finally {
					this.saving = false
				}
			}
		}
	}
</script>

<style>
	.aa-page { padding-bottom: 150rpx; }
	.aa-summary { display: flex; gap: 14rpx; margin-top: 34rpx; }
	.aa-summary > view { flex: 1; min-width: 0; padding: 24rpx; border: 1rpx solid rgba(20, 58, 85, 0.08); border-radius: 24rpx; background: rgba(255, 255, 255, 0.82); box-shadow: 0 12rpx 30rpx rgba(20, 58, 85, 0.05); }
	.aa-summary > view:first-child { background: #d5e8e8; }
	.aa-summary > view:last-child { background: #f8e9df; }
	.aa-summary text { display: block; }
	.aa-summary text:first-child { font-size: 21rpx; color: #52606c; }
	.aa-summary text:last-child { margin-top: 9rpx; font-size: 34rpx; font-weight: 800; color: #143a55; white-space: nowrap; }
	.aa-summary > view:last-child text:last-child { color: #8b5f50; }
	.aa-tabs { display: flex; gap: 30rpx; margin-top: 32rpx; border-bottom: 1rpx solid rgba(20, 58, 85, 0.08); }
	.aa-tabs view { padding: 0 4rpx 16rpx; font-size: 25rpx; color: #7e8896; }
	.aa-tabs view.active { border-bottom: 4rpx solid #143a55; color: #143a55; font-weight: 800; }
	.aa-list { display: grid; gap: 18rpx; margin-top: 20rpx; }
	.aa-card { padding: 26rpx 24rpx; border: 1rpx solid rgba(20, 58, 85, 0.08); border-radius: 24rpx; background: rgba(255, 255, 255, 0.82); box-shadow: 0 12rpx 30rpx rgba(20, 58, 85, 0.05); }
	.aa-card-head, .aa-card-footer, .aa-amount-row, .aa-card-actions { display: flex; align-items: center; }
	.aa-card-head { gap: 14rpx; }
	.aa-icon { display: flex; align-items: center; justify-content: center; width: 68rpx; height: 68rpx; flex: 0 0 68rpx; border-radius: 22rpx; }
	.aa-icon image { width: 42rpx; height: 42rpx; }
  .aa-edit,
  .aa-del {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56rpx;
    height: 56rpx;
  }
  .aa-edit image,
  .aa-del image { width: 28rpx; height: 28rpx; }
  /* .aa-del {margin-left: 16rpx;} */
	.aa-title-wrap { flex: 1; min-width: 0; }
	.aa-title-wrap text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.aa-title-wrap text:first-child { font-size: 28rpx; font-weight: 800; color: #1a2530; }
	.aa-title-wrap text:last-child { margin-top: 7rpx; font-size: 21rpx; color: #7e8896; }
	.aa-amount-row { justify-content: space-between; margin-top: 24rpx; font-size: 21rpx; color: #7e8896; }
	.aa-amount-row text:last-child { font-size: 29rpx; font-weight: 800; color: #1a2530; }
	.aa-progress { height: 13rpx; margin-top: 14rpx; border-radius: 999rpx; background: #eaf1f0; overflow: hidden; }
	.aa-progress-fill { height: 100%; border-radius: inherit; background: #4a8b79; }
	.aa-card-footer { justify-content: space-between; gap: 12rpx; margin-top: 13rpx; font-size: 21rpx; color: #7e8896; }
	.aa-card-actions { justify-content: flex-end; flex-wrap: wrap; gap: 8rpx; }
	.aa-pay-button, .aa-edit-button, .aa-delete-button { flex: 0 0 auto; padding: 9rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 700; }
	.aa-pay-button { background: #d5e8e8; color: #3b6e89; }
	.aa-edit-button { background: #f1eee7; color: #52606c; }
	.aa-delete-button { background: #f8e5e3; color: #c97b86; }
	.aa-create-button { position: fixed; right: 44rpx; bottom: calc(54rpx + var(--app-safe-bottom, env(safe-area-inset-bottom))); z-index: 40; display: flex; align-items: center; gap: 10rpx; height: 82rpx; padding: 0 26rpx 0 16rpx; border-radius: 999rpx; background: #143a55; color: #fff; box-shadow: 0 16rpx 34rpx rgba(20, 58, 85, 0.24); font-size: 25rpx; font-weight: 800; }
	.aa-create-button text:first-child { font-size: 34rpx; line-height: 1; }
	.editor-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; padding: 24rpx 24rpx calc(24rpx + var(--app-safe-bottom, env(safe-area-inset-bottom))); background: rgba(13, 40, 57, 0.38); box-sizing: border-box; }
	.editor-panel { width: 100%; max-height: calc(var(--app-window-height, 100vh) - 48rpx); padding: 34rpx 28rpx 26rpx; border-radius: 30rpx; background: #fffdf8; box-sizing: border-box; overflow-y: auto; }
	.editor-title { display: block; font-size: 32rpx; font-weight: 800; color: #143a55; }
	.editor-field { min-width: 0; margin-top: 22rpx; }
	.editor-field > text { display: block; margin-bottom: 9rpx; font-size: 22rpx; font-weight: 700; color: #52606c; }
	.editor-field input { width: 100%; height: 76rpx; padding: 0 20rpx; border: 1rpx solid rgba(20, 58, 85, 0.12); border-radius: 16rpx; background: #f7f2e8; box-sizing: border-box; font-size: 26rpx; color: #1a2530; }
	.editor-actions { display: flex; gap: 14rpx; margin-top: 28rpx; }
	.editor-actions view { flex: 1; height: 76rpx; border-radius: 16rpx; line-height: 76rpx; text-align: center; font-size: 26rpx; font-weight: 700; }
	.editor-actions view:first-child { background: #f1eee7; color: #66727c; }
	.editor-actions view:last-child { background: #143a55; color: #fff; }
	.empty-data { padding: 72rpx 24rpx; border-radius: 24rpx; background: rgba(255, 255, 255, 0.72); text-align: center; color: #9aa2ab; font-size: 24rpx; }
</style>
