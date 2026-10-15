<template>
	<view class="page-back-row" :class="{ inline: inline }">
		<view class="back-button" @tap="goBack">
			<text>‹</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'GoBack',
		props: {
			fallbackUrl: {
				type: String,
				default: '/pages/my/index'
			},
			fallbackMode: {
				type: String,
				default: 'switchTab'
			},
			inline: {
				type: Boolean,
				default: false
			}
		},
		methods: {
			goBack() {
				uni.navigateBack({
					delta: 1,
					fail: () => {
						if (this.fallbackMode === 'reLaunch') {
							uni.reLaunch({ url: this.fallbackUrl })
							return
						}

						uni.switchTab({ url: this.fallbackUrl })
					}
				})
			}
		}
	}
</script>

<style>
	.page-back-row {
		display: flex;
		align-items: center;
		margin-bottom: 28rpx;
	}

	.page-back-row.inline {
		width: 72rpx;
		height: 72rpx;
		margin-bottom: 0;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.76);
		color: #0d2839;
		box-shadow: 0 10rpx 24rpx rgba(20, 58, 85, 0.06);
	}

	.back-button text {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		font-size: 58rpx;
		font-weight: 300;
		line-height: 72rpx;
		transform: translateX(-3rpx);
	}
</style>
