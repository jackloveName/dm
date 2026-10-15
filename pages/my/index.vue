<template>
	<view class="bd-page profile-page" :class="themeClass" :style="pageHeightStyle">
		<view class="profile-card">
			<view class="bd-avatar profile-avatar" @tap="chooseAvatar">
				<image v-if="avatarUrl" class="profile-avatar-image" :src="avatarUrl" mode="aspectFill"></image>
				<view v-if="avatarUploading" class="profile-avatar-loading">
					<text>上传中</text>
				</view>
			</view>
			<text class="profile-name" @tap="openNameEditor">拾贝人 · {{ nickname }}</text>
			<text class="profile-level">{{ profileLevelText }}</text>
			<view class="profile-stats">
				<view v-for="item in stats" :key="item.label">
					<text class="profile-stat-value">{{ item.value }}</text>
					<text class="profile-stat-label">{{ item.label }}</text>
				</view>
			</view>
		</view>

		<view class="profile-shortcuts">
			<view v-for="item in shortcuts" :key="item.label" class="shortcut-card" @tap="openShortcut(item.url)">
				<image class="shortcut-icon" :src="item.iconPath" mode="aspectFit"></image>
				<text>{{ item.label }}</text>
			</view>
		</view>
		<item-header title="常用设置" />

		<view class="bd-list">
				<view v-for="item in settingMenus" :key="item.name" class="bd-list-row" @tap="openMenu(item)">
				<view class="bd-icon" :class="item.tone"><image :src="item.iconPath" mode="aspectFit"></image></view>
				<view class="bd-list-main">
					<text class="bd-list-title">{{ item.name }}</text>
					<text class="bd-list-meta">{{ item.meta }}</text>
				</view>
				<text v-if="item.rightText" class="bd-list-action">{{ item.rightText }}</text>
			</view>
		</view>

		<view v-if="showNameEditor" class="name-editor-mask" @tap="closeNameEditor" @touchmove.stop.prevent>
			<view class="name-editor-panel" @tap.stop @touchmove.stop>
				<text class="name-editor-title">修改昵称</text>
				<text class="name-editor-subtitle">更换一个你喜欢的名字吧~</text>
				<view class="name-editor-input-wrap">
					<text class="name-editor-prefix">拾贝人 ·</text>
					<input
						v-model="editingNickname"
						class="name-editor-input"
						maxlength="6"
						confirm-type="done"
						placeholder="请输入昵称"
						@confirm="saveName"
					/>
				</view>
				<text class="name-editor-count">{{ editingNickname.length }}/6</text>
				<view class="name-editor-actions">
					<view class="name-editor-button cancel" @tap="closeNameEditor">取消</view>
					<view class="name-editor-button confirm" @tap="saveName">保存</view>
				</view>
			</view>
		</view>

		<view v-if="showConfirmDialog" class="action-dialog-mask" @tap="closeConfirmDialog" @touchmove.stop.prevent>
			<view class="action-dialog-panel" @tap.stop @touchmove.stop>
				<text class="action-dialog-title">{{ pendingAction === 'deleteAccount' ? '注销账号' : '退出登录' }}</text>
				<text class="action-dialog-subtitle">
					{{ pendingAction === 'deleteAccount' ? '注销后将退出账号并清除当前设备上的本地数据，是否继续？' : '确定要退出当前账号吗？' }}
				</text>
				<view class="action-dialog-actions">
					<view class="action-dialog-button cancel" @tap="closeConfirmDialog">取消</view>
					<view class="action-dialog-button confirm" :class="{ loading: actionSubmitting }" @tap="confirmPendingAction">
						{{ actionSubmitting ? '处理中…' : '确认' }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
  import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import { destroyAccount, getUserDetail, loadBillData, logout, toBillItem, updateUserInfo } from '@/api/index.js'
	import { getDistinctRecordDays, getRecordStreak } from '@/common/insights.js'
	import { AA_SPLIT_STORAGE_KEY } from '@/common/aaSplit.js'
	import { SUBSCRIPTION_STORAGE_KEY } from '@/common/subscription.js'
	import { uploadAvatarFile } from '@/common/fileUpload.js'
	import { getNextShellTheme, getSavedShellTheme } from '@/common/theme.js'

	export default {
		components: {
      PageTop,
			ItemHeader
		},
		data() {
			return {
				avatarUrl: uni.getStorageSync('profileAvatar') || '',
				nickname: uni.getStorageSync('profileNickname') || '沙粒',
				userInfo: uni.getStorageSync('user_info') || {},
				showNameEditor: false,
				editingNickname: '',
				showConfirmDialog: false,
				pendingAction: '',
				actionSubmitting: false,
				avatarUploading: false,
				currentTheme: getSavedShellTheme(),
				transactions: [],
				stats: [
					{ value: '0', label: '坚持天数' },
					{ value: '0', label: '累计笔数' },
					{ value: '0', label: '记账天数' }
				],
				shortcuts: [
					{ label: '账单', iconPath: '/static/images/my/icon_book.png', url: '/pages/bill/index' },
					{ label: '预算', iconPath: '/static/images/my/icon_budget.png', url: '/pages/budget/index' },
					{ label: '目标', iconPath: '/static/images/my/icon_goal.png', url: '/pages/objective/index' },
					{ label: '徽章', iconPath: '/static/images/my/icon_badge.png', url: '/pages/badge/index' }
				],
        // #1f4e6e
				menus: [
					{ name: '主题换肤', meta: '点击切换贝壳色系', iconPath: '/static/images/my/icon_theme.png', tone: 'tone-sand', action: 'cycleTheme' },
					{ name: '隐私协议', meta: '', iconPath: '/static/images/my/icon_privacy.png', tone: 'tone-sand', url: '/pages/mine/terms/index?title=隐私政策&key=DMJZ_PRIVACY_PROTOC' },
					{ name: '注册协议', meta: '', iconPath: '/static/images/my/icon_registration.png', tone: 'tone-sand', url: '/pages/mine/terms/index?title=平台注册协议&key=DMJZ_REGISTER_PROTOC' },
					{ name: '退出登录', meta: '', iconPath: '/static/images/my/icon_theme.png', tone: 'tone-sand', action: 'logout' },
          { name: '注销账号', meta: '', iconPath: '/static/images/my/icon_reminder.png', tone: 'tone-sand', action: 'deleteAccount' }
				]
			}
		},
		onShow() {
			this.loadUserProfile()
			this.loadBillStats()
		},
		computed: {
			themeClass() {
				return this.currentTheme.className
			},
			settingMenus() {
				return this.menus.map((item) => (
					item.action === 'cycleTheme' ? { ...item, rightText: this.currentTheme.name } : item
				))
			},
			profileLevelText() {
				return this.transactions.length ? `已连续记账 ${getRecordStreak(this.transactions)} 天` : '暂无记账数据'
			}
		},
		methods: {
			async loadBillStats() {
				const bills = await loadBillData()
				this.transactions = bills.map(toBillItem)
				this.stats = [
					{ value: String(getRecordStreak(this.transactions)), label: '坚持天数' },
					{ value: String(this.transactions.length), label: '累计笔数' },
					{ value: String(getDistinctRecordDays(this.transactions)), label: '记账天数' }
				]
			},
			openMenu(item) {
				if (!item) return
				if (item.action === 'cycleTheme') {
					this.changeTheme()
					return
				}
				if (item.action) {
					this.openConfirmDialog(item.action)
					return
				}
				if (!item.url) return
				uni.navigateTo({
					url: item.url,
					fail: () => uni.showToast({ title: '页面暂不可用', icon: 'none' })
				})
			},
			changeTheme() {
				const nextTheme = getNextShellTheme(this.currentTheme.key)
				this.currentTheme = nextTheme
				uni.setStorageSync('app_theme', nextTheme.key)
				uni.showToast({ title: `已切换：${nextTheme.name}`, icon: 'none' })
			},
			openConfirmDialog(action) {
				this.pendingAction = action
				this.showConfirmDialog = true
			},
			closeConfirmDialog() {
				if (this.actionSubmitting) return
				this.showConfirmDialog = false
				this.pendingAction = ''
			},
			async confirmPendingAction() {
				if (this.actionSubmitting || !this.pendingAction) return
				this.actionSubmitting = true
				const action = this.pendingAction
				try {
					if (action === 'deleteAccount') {
						await destroyAccount()
					} else {
						await logout()
					}
					this.clearLocalAccountData()
					this.showConfirmDialog = false
					const message = action === 'deleteAccount' ? '账号已注销' : '已退出登录'
					this.pendingAction = ''
					uni.showToast({ title: message, icon: 'success' })
					setTimeout(() => uni.reLaunch({ url: '/pages/login' }), 500)
				} catch (error) {
					uni.showToast({ title: error.message || '操作失败，请重试', icon: 'none' })
				} finally {
					this.actionSubmitting = false
				}
			},
			clearLocalAccountData() {
				const keys = ['App-Token', 'user_info', 'login_account', 'profileAvatar', 'profileNickname', 'mock_bill_data', 'open_bill_list', 'savings_plan', 'monthlyBudgets', 'paydayBudgetSettings', AA_SPLIT_STORAGE_KEY, SUBSCRIPTION_STORAGE_KEY]
				keys.forEach((key) => {
					uni.removeStorageSync(key)
				})
				this.userInfo = {}
				this.avatarUrl = ''
			},
			openShortcut(url) {
				if (!url) return

				uni.navigateTo({
					url,
					fail: () => {
						uni.showToast({ title: '页面暂不可用', icon: 'none' })
					}
				})
			},
			openNameEditor() {
				this.editingNickname = this.nickname
				this.showNameEditor = true
			},
			closeNameEditor() {
				this.showNameEditor = false
				this.editingNickname = ''
			},
			async saveName() {
				const nextNickname = (this.editingNickname || '').trim().slice(0, 6)
				if (!nextNickname) {
					uni.showToast({ title: '请输入昵称', icon: 'none' })
					return
				}

				this.nickname = nextNickname
				uni.setStorageSync('profileNickname', nextNickname)
				this.userInfo = { ...this.userInfo, nickName: `拾贝人 · ${nextNickname}` }
				uni.setStorageSync('user_info', this.userInfo)
				this.syncUserInfo({ nickName: `拾贝人 · ${nextNickname}` })
				this.closeNameEditor()
				uni.showToast({ title: '昵称已更新', icon: 'success' })
			},
			async loadUserProfile() {
				const cachedUser = uni.getStorageSync('user_info') || {}
				this.applyUserInfo(cachedUser)

				if (!uni.getStorageSync('App-Token')) return

				try {
					const userInfo = await getUserDetail()
					if (userInfo) {
						this.userInfo = userInfo
						uni.setStorageSync('user_info', userInfo)
						this.applyUserInfo(userInfo)
					}
				} catch (error) {
					uni.showToast({ title: '用户信息请求失败', icon: 'none' })
				}
			},
			applyUserInfo(userInfo) {
				if (!userInfo || typeof userInfo !== 'object') return
				if (userInfo.pic) {
					this.avatarUrl = userInfo.pic
					uni.setStorageSync('profileAvatar', userInfo.pic)
				}

				if (userInfo.nickName) {
					const nameParts = String(userInfo.nickName).split('·')
					const nickname = (nameParts[nameParts.length - 1] || '').trim().slice(0, 6)
					if (nickname) {
						this.nickname = nickname
						uni.setStorageSync('profileNickname', nickname)
					}
				}
			},
			syncUserInfo(data) {
				if (!uni.getStorageSync('App-Token')) return
				updateUserInfo({ ...this.userInfo, ...data }).catch(() => {})
			},
			chooseAvatar() {
				if (this.avatarUploading) return

				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const avatarPath = res.tempFilePaths && res.tempFilePaths[0]
						if (!avatarPath) return

						this.uploadAvatar(avatarPath, res.tempFiles && res.tempFiles[0])
					},
					fail: (error) => {
						if (error && error.errMsg && error.errMsg.indexOf('cancel') === -1) {
							uni.showToast({ title: '头像选择失败', icon: 'none' })
						}
					}
				})
			},
			async uploadAvatar(localPath, file) {
				const previousAvatar = this.avatarUrl
				this.avatarUploading = true
				this.avatarUrl = localPath

				try {
					const prepared = await this.prepareAvatarFile(localPath, file)
					const avatarUrl = await Promise.race([
						uploadAvatarFile(prepared.file, prepared.path),
						new Promise((resolve, reject) => {
							setTimeout(() => reject(new Error('头像上传超时，请重试')), 90000)
						})
					])
					await updateUserInfo({ ...this.userInfo, pic: avatarUrl })

					this.avatarUrl = avatarUrl
					this.userInfo = { ...this.userInfo, pic: avatarUrl }
					uni.setStorageSync('profileAvatar', avatarUrl)
					uni.setStorageSync('user_info', this.userInfo)
					uni.showToast({ title: '头像已更新', icon: 'success' })
				} catch (error) {
					this.avatarUrl = previousAvatar
					uni.showToast({ title: error.message || '头像上传失败', icon: 'none' })
				} finally {
					this.avatarUploading = false
				}
			},
			async prepareAvatarFile(localPath, file) {
				let nextPath = localPath
				let nextFile = file

				// #ifdef APP-PLUS
				try {
					const compressed = await Promise.race([
						new Promise((resolve, reject) => {
							uni.compressImage({
								src: localPath,
								quality: 80,
								success: resolve,
								fail: reject
							})
						}),
						new Promise((resolve, reject) => {
							setTimeout(() => reject(new Error('压缩图片超时')), 10000)
						})
					])
					if (compressed && compressed.tempFilePath) {
						nextPath = compressed.tempFilePath
						nextFile = Object.assign({}, file || {}, {
							path: nextPath,
							tempFilePath: nextPath,
							type: 'image/jpeg',
							name: nextPath.split('/').pop() || 'avatar.jpg'
						})
					}
				} catch (error) {
					// Keep the original file when compression is unavailable.
				}
				// #endif

				return { path: nextPath, file: nextFile }
			}
		}
	}
</script>

<style>
	.profile-card {
		margin-top: 24rpx;
		padding: 64rpx 56rpx 42rpx;
		border-radius: 42rpx;
		background: linear-gradient(135deg, #efa08f 0%, #b99eca 50%, #80bea8 100%);
		box-shadow: 0 22rpx 50rpx rgba(143, 128, 155, 0.26);
		text-align: center;
		box-sizing: border-box;
	}

	.profile-avatar {
		position: relative;
		width: 138rpx;
		height: 138rpx;
		margin: 0 auto 28rpx;
		padding: 0;
		border: 6rpx solid rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.12);
		box-shadow: none;
		box-sizing: border-box;
		overflow: hidden;
		cursor: pointer;
	}

	.profile-avatar-image {
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.profile-avatar-loading {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(13, 40, 57, 0.58);
		font-size: 20rpx;
		font-weight: 700;
		color: #fbf8f2;
	}

	.profile-avatar::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 52rpx;
		height: 52rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.28);
		transform: translate(-50%, -50%);
	}

	.profile-avatar::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 42rpx;
		height: 42rpx;
		border-radius: 999rpx;
		background:
			linear-gradient(to right, transparent 47%, rgba(255, 255, 255, 0.9) 48%, rgba(255, 255, 255, 0.9) 52%, transparent 53%),
			linear-gradient(to bottom, transparent 47%, rgba(255, 255, 255, 0.9) 48%, rgba(255, 255, 255, 0.9) 52%, transparent 53%),
			radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.2) 70%);
		transform: translate(-50%, -50%);
	}

	.profile-name,
	.profile-level,
	.profile-stat-value,
	.profile-stat-label {
		display: block;
	}

	.profile-name {
		font-size: 38rpx;
		font-weight: 800;
		line-height: 1.2;
		color: #fff;
		cursor: pointer;
	}

	.name-editor-mask {
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

	.name-editor-panel {
		width: 100%;
		max-width: 620rpx;
		padding: 42rpx 36rpx 30rpx;
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		box-sizing: border-box;
	}

	.name-editor-title,
	.name-editor-subtitle,
	.name-editor-count {
		display: block;
	}

	.name-editor-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.name-editor-subtitle {
		margin-top: 12rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: #7e8896;
	}

	.name-editor-input-wrap {
		display: flex;
		align-items: center;
		gap: 14rpx;
		margin-top: 28rpx;
		padding: 0 24rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.12);
		border-radius: 18rpx;
		background: #f7f2e8;
		box-sizing: border-box;
	}

	.name-editor-prefix {
		flex: 0 0 auto;
		font-size: 27rpx;
		font-weight: 700;
		color: #52606c;
	}

	.name-editor-input {
		flex: 1;
		min-width: 0;
		height: 88rpx;
		font-size: 29rpx;
		font-weight: 700;
		color: #1a2530;
	}

	.name-editor-count {
		margin-top: 10rpx;
		text-align: right;
		font-size: 21rpx;
		color: #9aa2ab;
	}

	.name-editor-actions {
		display: flex;
		gap: 18rpx;
		margin-top: 28rpx;
	}

	.name-editor-button {
		flex: 1;
		height: 76rpx;
		line-height: 76rpx;
		border-radius: 18rpx;
		text-align: center;
		font-size: 27rpx;
		font-weight: 700;
	}

	.name-editor-button.cancel {
		background: #f1eee7;
		color: #66727c;
	}

	.name-editor-button.confirm {
		background: #143a55;
		color: #fff;
	}

	.action-dialog-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 110;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
		background: rgba(13, 40, 57, 0.38);
		box-sizing: border-box;
	}

	.action-dialog-panel {
		width: 100%;
		max-width: 620rpx;
		padding: 42rpx 36rpx 30rpx;
		border-radius: 30rpx;
		background: #fffdf8;
		box-shadow: 0 24rpx 70rpx rgba(13, 40, 57, 0.2);
		box-sizing: border-box;
	}

	.action-dialog-title,
	.action-dialog-subtitle {
		display: block;
	}

	.action-dialog-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.action-dialog-subtitle {
		margin-top: 14rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: #7e8896;
	}

	.action-dialog-actions {
		display: flex;
		gap: 18rpx;
		margin-top: 30rpx;
	}

	.action-dialog-button {
		flex: 1;
		height: 76rpx;
		border-radius: 18rpx;
		text-align: center;
		font-size: 27rpx;
		font-weight: 700;
		line-height: 76rpx;
	}

	.action-dialog-button.cancel {
		background: #f1eee7;
		color: #66727c;
	}

	.action-dialog-button.confirm {
		background: #143a55;
		color: #fff;
	}

	.action-dialog-button.confirm.loading {
		opacity: 0.66;
	}

	.profile-level {
		margin-top: 12rpx;
		font-size: 25rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: rgba(255, 255, 255, 0.86);
	}

	.profile-stats {
		display: flex;
		gap: 12rpx;
		margin-top: 58rpx;
		padding-top: 46rpx;
		border-top: 1rpx solid rgba(255, 255, 255, 0.28);
	}

	.profile-stats view {
		flex: 1;
		min-width: 0;
	}

	.profile-stat-value {
		font-size: 43rpx;
		font-weight: 800;
		line-height: 1;
		color: #fff;
	}

	.profile-stat-label {
		margin-top: 16rpx;
		font-size: 24rpx;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.78);
	}

	.profile-shortcuts {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 26rpx;
		margin-top: 34rpx;
	}

	.shortcut-card {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 14rpx;
		height: 150rpx;
		border-radius: 32rpx;
		background: #fff;
		font-size: 25rpx;
		font-weight: 600;
		color: #253445;
		box-shadow: 0 10rpx 24rpx rgba(20, 58, 85, 0.04);
		box-sizing: border-box;
	}

	.shortcut-icon {
		width: 50rpx;
		height: 50rpx;
	}

	.bd-list .bd-icon image {
		width: 38rpx;
		height: 38rpx;
	}
</style>
