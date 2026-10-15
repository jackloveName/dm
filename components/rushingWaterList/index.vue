<template>
	<view class="bd-list" :class="{ 'interactive-list': editable }">
		<template v-if="transactions.length">
			<view
				v-for="(item, index) in transactions"
				:key="getTransactionKey(item, index)"
				class="transaction-swipe"
				:class="{ active: activeSwipeIndex === index }"
			>
				<view
					v-if="editable"
					class="transaction-delete"
					:class="{ deleting: deletingTransactionId === getTransactionId(item) }"
					@tap.stop="confirmDelete(item, index)"
				>
					<text>{{ deletingTransactionId === getTransactionId(item) ? '删除中' : '删除' }}</text>
				</view>
				<view
					class="bd-list-row transaction-row"
					@touchstart="editable ? handleSwipeTouchStart(index, $event) : null"
					@touchmove="editable ? handleSwipeTouchMove(index, $event) : null"
					@touchend="editable ? handleSwipeTouchEnd(index) : null"
					@tap="editable ? handleTransactionTap(item, index) : null"
				>
					<view class="bd-icon" :class="item.tone">
						<image v-if="item.iconPath" class="bd-list-icon-img" :src="item.iconPath" mode="aspectFit"></image>
						<text v-else>{{ item.icon }}</text>
					</view>
					<view class="bd-list-main">
						<text class="bd-list-title">{{ item.name }}</text>
						<text class="bd-list-meta">{{ formatTransactionTime(item) }} · {{ item.category }}</text>
					</view>
					<text class="bd-amount" :class="{ income: item.type === 'in' }">{{ item.amount }}</text>
				</view>
			</view>
		</template>
		<view v-else class="empty-data">
			<text>暂无数据</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'RushingWaterList',
		props: {
			transactions: {
				type: Array,
				default: () => []
			},
			showFullDateTime: {
				type: Boolean,
				default: false
			},
			editable: {
				type: Boolean,
				default: false
			},
			deletingTransactionId: {
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
			transactions() {
				if (this.activeSwipeIndex >= this.transactions.length) this.activeSwipeIndex = -1
			}
		},
		methods: {
			formatTransactionTime(item) {
				if (!this.showFullDateTime) return item && item.time ? item.time : '时间未记录'

				const source = String(item && (item.fullDate || item.date || item.time) || '').trim()
				const match = source.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?(?:[ T](\d{1,2})[:：](\d{2}))?/)
				if (!match) return item && item.time ? item.time : '时间未记录'

				const year = match[1]
				const month = Number(match[2])
				const day = Number(match[3])
				const hour = match[4] === undefined ? '' : ` ${String(Number(match[4])).padStart(2, '0')}:${match[5]}`
				return `${year}年${month}月${day}日${hour}`
			},
			getTransactionKey(item, index) {
				const id = item && (item.id || item.recordId || item.billId)
				if (id) return String(id) + '-' + index

				const name = item && item.name ? item.name : 'transaction'
				const time = item && item.time ? item.time : 'no-time'
				const category = item && item.category ? item.category : 'no-category'
				const amount = item && item.amount ? item.amount : 'no-amount'

				return name + '-' + time + '-' + category + '-' + amount + '-' + index
			},
			getTransactionId(item) {
				return String(item && (item.id || item.recordId || item.billId) || '')
			},
			getTouchPoint(event) {
				return (event && event.touches && event.touches[0]) || (event && event.changedTouches && event.changedTouches[0]) || {}
			},
			handleSwipeTouchStart(index, event) {
				if (!this.editable || this.deletingTransactionId) return
				if (this.activeSwipeIndex !== -1 && this.activeSwipeIndex !== index) this.activeSwipeIndex = -1

				const point = this.getTouchPoint(event)
				this.swipeState = {
					index,
					startX: Number(point.clientX || 0),
					startY: Number(point.clientY || 0),
					isSwiping: false
				}
			},
			handleSwipeTouchMove(index, event) {
				if (!this.editable || this.swipeState.index !== index || this.deletingTransactionId) return

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
			handleTransactionTap(item, index) {
				if (!this.editable || this.suppressNextTap) return
				if (this.activeSwipeIndex === index) {
					this.activeSwipeIndex = -1
					return
				}
				this.$emit('transactionTap', item, index)
			},
			confirmDelete(item, index) {
				if (!this.editable || this.deletingTransactionId || !item) return
				this.activeSwipeIndex = -1
				this.suppressNextTap = false
				uni.showModal({
					title: '删除账单',
					content: `是否确定删除“${item.name || item.category || '这笔账单'}”吗？`,
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
	.bd-list-icon-img {
		width: 38rpx;
		height: 38rpx;
	}

	.transaction-swipe {
		position: relative;
		overflow: hidden;
		border-radius: 22rpx;
	}

	.transaction-delete {
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
		border-radius: 0 22rpx 22rpx 0;
		opacity: 0;
		pointer-events: none;
		transform: translateX(100%);
		transition: opacity 0.18s ease, transform 0.18s ease;
	}

	.transaction-delete.deleting {
		opacity: 0.66;
	}

	.interactive-list .transaction-swipe.active .transaction-delete {
		opacity: 1;
		pointer-events: auto;
		transform: translateX(0);
	}

	.interactive-list .transaction-row {
		position: relative;
		z-index: 2;
		background: #fff;
		border-radius: 22rpx;
		transition: transform 0.18s ease;
		touch-action: pan-y;
	}

	.interactive-list .transaction-swipe.active .transaction-row {
		transform: translate3d(-128rpx, 0, 0);
	}

	.empty-data {
		padding: 48rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		font-size: 24rpx;
		text-align: center;
		color: #9aa2ab;
	}

	.interactive-list {
		padding: 12rpx 14rpx;
	}

	.interactive-list .transaction-swipe + .transaction-swipe {
		margin-top: 10rpx;
	}

	.interactive-list .transaction-row {
		/* min-height: 104rpx; */
		padding: 18rpx;
		border-bottom: 0;
	}

	.interactive-list .bd-list-title,
	.interactive-list .bd-list-meta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.interactive-list .bd-amount {
		flex: 0 0 auto;
		max-width: 220rpx;
		white-space: nowrap;
	}
</style>
