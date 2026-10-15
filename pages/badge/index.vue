<template>
	<view class="bd-page badge-page" :class="themeClass" :style="pageHeightStyle">
		<go-back />

		<page-top
			eyebrow="ACHIEVEMENTS"
			title="我的徽章"
			subtitle="每一次坚持，都会留下值得收藏的光。"
		/>

		<view class="badge-overview">
			<view class="badge-overview-copy">
				<text class="badge-overview-label">已点亮徽章</text>
				<text class="badge-overview-value">{{ unlockedCount }}<text class="badge-overview-total"> / {{ badges.length }}</text></text>
				<text class="badge-overview-copy-text">{{ unlockedCount ? '继续记账，收集更多属于你的贝壳。' : '暂无数据' }}</text>
			</view>
			<view class="badge-emblem">
				<image src="/static/images/my/icon_badge.png" mode="aspectFit"></image>
			</view>
		</view>

		<item-header title="已获得" :link-text="unlockedCount + ' 枚'" />
		<view class="badge-grid">
			<view v-for="item in unlockedBadges" :key="item.name" class="badge-card unlocked" @tap="showBadgeDetail(item)">
				<view class="badge-image-wrap" :class="item.tone">
					<image :src="item.imagePath" mode="aspectFit"></image>
				</view>
				<text class="badge-name">{{ item.name }}</text>
				<text class="badge-description">{{ item.description }}</text>
				<text class="badge-date">{{ item.earnedAt }}</text>
			</view>
		</view>

		<view v-if="!unlockedBadges.length" class="empty-data">
			<text>暂无数据</text>
		</view>

		<item-header title="待解锁" :link-text="lockedBadges.length + ' 枚'" />
		<view class="badge-grid">
			<view v-for="item in lockedBadges" :key="item.name" class="badge-card locked" @tap="showBadgeDetail(item)">
				<view class="badge-image-wrap" :class="item.tone">
					<image :src="item.imagePath" mode="aspectFit"></image>
				</view>
				<text class="badge-name">{{ item.name }}</text>
				<text class="badge-description">{{ item.description }}</text>
				<text class="badge-progress">{{ item.progress }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { loadBillData, toBillItem } from '@/api/index.js'
	import { buildBadgeMetrics, buildBadges } from '@/common/badge.js'

	export default {
		components: {
			PageTop,
			ItemHeader,
			GoBack
		},
		data() {
			return {
				badges: []
			}
		},
		onShow() {
			this.loadBadges()
		},
		computed: {
			unlockedBadges() {
				return this.badges.filter((item) => item.unlocked)
			},
			lockedBadges() {
				return this.badges.filter((item) => !item.unlocked)
			},
			unlockedCount() {
				return this.unlockedBadges.length
			}
		},
		methods: {
			async loadBadges() {
				const bills = await loadBillData()
				const transactions = bills.map(toBillItem)
				this.badges = buildBadges(buildBadgeMetrics(transactions))
			},
			showBadgeDetail(item) {
				uni.showToast({
					title: item.unlocked ? item.name : item.progress,
					icon: 'none'
				})
			}
		}
	}
</script>

<style>
	.badge-page {
		padding-bottom: 90rpx;
	}

	.badge-overview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		margin-top: 34rpx;
		min-height: 214rpx;
		padding: 34rpx 36rpx;
		border-radius: 42rpx;
		background: linear-gradient(135deg, #f0d5d8 0%, #b59ec2 55%, #7fb9a6 100%);
		box-shadow: 0 20rpx 46rpx rgba(181, 158, 194, 0.22);
		box-sizing: border-box;
		overflow: hidden;
	}

	.badge-overview::after {
		content: '';
		position: absolute;
		right: -70rpx;
		bottom: -112rpx;
		width: 260rpx;
		height: 260rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.2);
	}

	.badge-overview-copy,
	.badge-emblem {
		position: relative;
		z-index: 1;
	}

	.badge-overview-label,
	.badge-overview-value,
	.badge-overview-copy-text,
	.badge-name,
	.badge-description,
	.badge-date,
	.badge-progress {
		display: block;
	}

	.badge-overview-label {
		font-size: 22rpx;
		letter-spacing: 3rpx;
		color: rgba(13, 40, 57, 0.68);
	}

	.badge-overview-value {
		margin-top: 8rpx;
		font-size: 66rpx;
		font-weight: 800;
		line-height: 1;
		color: #0d2839;
	}

	.badge-overview-total {
		font-size: 32rpx;
		font-weight: 700;
		color: rgba(13, 40, 57, 0.56);
	}

	.badge-overview-copy-text {
		max-width: 360rpx;
		margin-top: 14rpx;
		font-size: 23rpx;
		line-height: 1.55;
		color: #1f4e6e;
	}

	.badge-emblem {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 138rpx;
		height: 138rpx;
		flex: 0 0 138rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.46);
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.25);
		box-sizing: border-box;
	}

	.badge-emblem image {
		width: 90rpx;
		height: 90rpx;
	}

	.badge-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18rpx;
	}

	.badge-card {
		min-width: 0;
		padding: 24rpx 18rpx 22rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 12rpx 30rpx rgba(20, 58, 85, 0.05);
		text-align: center;
		box-sizing: border-box;
	}

	.badge-card.locked {
		background: rgba(255, 255, 255, 0.54);
	}

	.badge-image-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 118rpx;
		height: 118rpx;
		margin: 0 auto 18rpx;
		border-radius: 999rpx;
	}

	.badge-image-wrap image {
		width: 82rpx;
		height: 82rpx;
	}

	.badge-card.locked .badge-image-wrap {
		filter: grayscale(0.75);
		opacity: 0.48;
	}

	.badge-name {
		font-size: 27rpx;
		font-weight: 800;
		color: #1a2530;
	}

	.badge-description {
		min-height: 62rpx;
		margin-top: 8rpx;
		font-size: 21rpx;
		line-height: 1.5;
		color: #7e8896;
	}

	.badge-date,
	.badge-progress {
		margin-top: 12rpx;
		font-size: 20rpx;
		color: #4a8b79;
	}

	.badge-progress {
		color: #a28d78;
	}

	.empty-data {
		margin-bottom: 24rpx;
		padding: 64rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		font-size: 24rpx;
		text-align: center;
		color: #9aa2ab;
	}
</style>
