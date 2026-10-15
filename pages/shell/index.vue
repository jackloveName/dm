<template>
	<view class="bd-page shell-page" :class="themeClass" :style="pageHeightStyle">
		<go-back fallback-url="/pages/home/index" fallback-mode="reLaunch" />
		<page-top eyebrow="RECORD GROWTH" title="记录成长" subtitle="连续记录、逐级积累，用贝壳阶段留下你的记账轨迹。" />

		<view class="shell-stage">
			<text class="shell-name">贝贝 · {{ shellName }}</text>
			<text class="shell-level">Lv.{{ shellLevel }} ｜ {{ shellTitle }}</text>
			<view class="shell-image-wrap">
				<view class="shell-ring"></view>
				<image :src="shellImagePath" mode="aspectFit"></image>
			</view>
			<view class="xp-top"><text>经验值 {{ currentXp }} / {{ xpTarget }}</text><text>{{ xpPercent }}%</text></view>
			<view class="xp-bar"><view class="xp-fill" :style="{ width: xpPercent + '%' }"></view></view>
			<view class="shell-stats">
				<view><text>{{ recordStreak }} 天</text><text>连续记账</text></view>
				<view><text>{{ transactions.length }} 笔</text><text>累计记账</text></view>
				<view><text>{{ unlockedCount }} 枚</text><text>获得徽章</text></view>
			</view>
		</view>

		<item-header title="成就徽章" :link-text="`已解锁 ${unlockedCount} / ${badges.length}`" @linkTap="openBadges" />
		<view class="badge-strip">
			<view v-for="(badge, index) in badgesPreview" :key="badge.name + '-' + index" class="badge-chip" :class="{ locked: !badge.unlocked }">
				<view class="badge-chip-image" :class="badge.tone"><image :src="badge.imagePath" mode="aspectFit"></image></view>
				<text>{{ badge.name }}</text>
			</view>
		</view>

		<item-header title="今日成长" />
		<view class="growth-list">
			<view class="growth-row"><view class="growth-icon tone-blue"><text>¥</text></view><view><text>每记一笔账</text><text>记录收入或支出，持续积累经验</text></view><text class="growth-xp">+10 XP</text></view>
			<view class="growth-row"><view class="growth-icon tone-mint"><text>↗</text></view><view><text>连续记账加成</text><text>连续记录 3 天起获得加成，最高可获得 15 XP</text></view><text class="growth-xp">+{{ streakBonus }} XP</text></view>
			<view class="growth-row"><view class="growth-icon tone-gold"><text>★</text></view><view><text>解锁成就徽章</text><text>完成目标后自动点亮已有徽章</text></view><text class="growth-xp">+50 XP</text></view>
		</view>
	</view>
</template>

<script>
	import PageTop from '@/components/pageTop/index.vue'
	import ItemHeader from '@/components/itemHeader/index.vue'
	import GoBack from '@/components/goBack/index.vue'
	import { loadBillData, toBillItem } from '@/api/index.js'
	import { buildBadgeMetrics, buildBadges } from '@/common/badge.js'
	import { getRecordStreak } from '@/common/insights.js'
	import { getShellExperience, getShellLevelInfo, getShellStreakBonus } from '@/common/shellLevel.js'

	export default {
		components: { PageTop, ItemHeader, GoBack },
		data() {
			return { transactions: [] }
		},
		computed: {
			badges() {
				return buildBadges(buildBadgeMetrics(this.transactions))
			},
			badgesPreview() {
				const unlocked = this.badges.filter((item) => item.unlocked)
				return (unlocked.length ? unlocked : this.badges).slice(0, 4)
			},
			unlockedCount() { return this.badges.filter((item) => item.unlocked).length },
			recordStreak() { return getRecordStreak(this.transactions) },
			streakBonus() { return getShellStreakBonus(this.recordStreak) },
			shellExperience() { return getShellExperience(this.transactions.length, this.recordStreak) },
			shellLevelInfo() { return getShellLevelInfo(this.shellExperience) },
			shellLevel() { return this.shellLevelInfo.level },
			shellImagePath() { return this.shellLevelInfo.imagePath },
			shellName() { return this.shellLevelInfo.name },
			shellTitle() { return this.shellLevelInfo.name },
			currentXp() { return this.shellLevelInfo.totalExperience },
			xpTarget() { return this.shellLevelInfo.nextRequiredExperience },
			xpPercent() { return this.shellLevelInfo.progressPercent }
		},
		onShow() { this.loadData() },
		methods: {
			async loadData() { this.transactions = (await loadBillData()).map(toBillItem) },
			openBadges() { uni.navigateTo({ url: '/pages/badge/index' }) }
		}
	}
</script>

<style>
	.shell-page { padding-bottom: 100rpx; }
	.shell-stage { position: relative; margin-top: 34rpx; padding: 34rpx 28rpx 26rpx; border-radius: 38rpx; text-align: center; background: linear-gradient(160deg, #e0f2fe 0%, #cffafe 42%, #e0e7ff 100%); overflow: hidden; }
	.shell-stage::after { content: ''; position: absolute; right: -76rpx; top: -80rpx; width: 240rpx; height: 240rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.34); }
	.shell-name, .shell-level, .xp-top, .shell-stats text { display: block; position: relative; z-index: 1; }
	.shell-name { font-size: 32rpx; font-weight: 800; color: #1a2530; }
	.shell-level { margin-top: 7rpx; font-size: 23rpx; font-weight: 700; color: #1f8695; }
	.shell-image-wrap { position: relative; z-index: 1; width: 230rpx; height: 230rpx; margin: 18rpx auto 16rpx; }
	.shell-image-wrap image { position: relative; z-index: 1; width: 100%; height: 100%; }
	.shell-ring { position: absolute; inset: 12rpx; border: 2rpx dashed rgba(31, 134, 149, 0.38); border-radius: 999rpx; }
	.xp-top { display: flex; justify-content: space-between; margin: 0 8rpx 8rpx; font-size: 22rpx; color: #52606c; }
	.xp-bar { position: relative; z-index: 1; height: 16rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.78); overflow: hidden; }
	.xp-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #0ea5e9); }
	.shell-stats { position: relative; z-index: 1; display: flex; gap: 10rpx; margin-top: 22rpx; }
	.shell-stats > view { flex: 1; padding: 12rpx 6rpx; border-radius: 16rpx; background: rgba(255, 255, 255, 0.5); }
	.shell-stats text:first-child { font-size: 25rpx; font-weight: 800; color: #1a2530; }
	.shell-stats text:last-child { margin-top: 5rpx; font-size: 19rpx; color: #7e8896; }
	.badge-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; }
	.badge-chip { min-width: 0; text-align: center; }
	.badge-chip-image { display: flex; align-items: center; justify-content: center; width: 82rpx; height: 82rpx; margin: 0 auto 8rpx; border-radius: 999rpx; }
	.badge-chip-image image { width: 58rpx; height: 58rpx; }
	.badge-chip text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 19rpx; color: #52606c; }
	.badge-chip.locked .badge-chip-image { filter: grayscale(0.8); opacity: 0.48; }
	.growth-list { padding: 0 24rpx; border: 1rpx solid rgba(20, 58, 85, 0.08); border-radius: 28rpx; background: rgba(255, 255, 255, 0.76); }
	.growth-row { display: flex; align-items: center; gap: 14rpx; min-width: 0; padding: 22rpx 0; border-bottom: 1rpx solid rgba(20, 58, 85, 0.08); }
	.growth-row:last-child { border-bottom: 0; }
	.growth-icon { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; flex: 0 0 56rpx; border-radius: 18rpx; font-size: 25rpx; font-weight: 800; }
	.growth-row > view:nth-child(2) { flex: 1; min-width: 0; }
	.growth-row > view:nth-child(2) text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.growth-row > view:nth-child(2) text:first-child { font-size: 25rpx; font-weight: 700; color: #1a2530; }
	.growth-row > view:nth-child(2) text:last-child { margin-top: 5rpx; font-size: 20rpx; line-height: 1.45; color: #7e8896; white-space: normal; }
	.growth-xp { flex: 0 0 auto; font-size: 21rpx; font-weight: 800; color: #4a8b79; }
</style>
