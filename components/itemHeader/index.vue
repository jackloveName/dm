<template>
	<view v-if="title || linkText" class="bd-section-head">
		<text v-if="title" class="bd-section-title">{{ title }}</text>
		<slot name="action">
			<text v-if="linkText" class="bd-section-link" @tap="handleLinkTap">{{ linkText }}</text>
		</slot>
	</view>
</template>

<script>
	export default {
		name: 'ItemHeader',
		props: {
			title: {
				type: String,
				default: ''
			},
			linkText: {
				type: String,
				default: ''
			},
			linkUrl: {
				type: String,
				default: ''
			}
		},
		methods: {
			handleLinkTap() {
				if (this.linkUrl) {
					this.openPage(this.linkUrl)
				}

				this.$emit('linkTap')
			},
			openPage(url) {
				// #ifdef H5
				if (typeof window !== 'undefined') {
					uni.navigateTo({
						url,
						fail: () => {
							window.location.hash = url
						}
					})
					return
				}
				// #endif

				uni.navigateTo({
					url,
					fail: () => {
						uni.switchTab({ url })
					}
				})
			}
		}
	}
</script>
