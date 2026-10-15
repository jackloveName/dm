<template>
	<view v-if="hasContent" class="bd-header">
		<view v-if="hasText">
			<text v-if="eyebrow" class="bd-eyebrow">{{ eyebrow }}</text>
			<text v-if="title" class="bd-title page-top-title" :class="titleAlignClass">{{ title }}</text>
			<text v-if="subtitle" class="bd-subtitle">{{ subtitle }}</text>
		</view>
		<view v-if="showAvatar" class="bd-avatar"></view>
	</view>
</template>

<script>
	export default {
		name: 'PageTop',
		props: {
			eyebrow: {
				type: String,
				default: ''
			},
			title: {
				type: String,
				default: ''
			},
			subtitle: {
				type: String,
				default: ''
			},
			titleAlign: {
				type: String,
				default: 'left'
			},
			showAvatar: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			titleAlignClass() {
				const alignMap = {
					left: 'title-align-left',
					center: 'title-align-center',
					right: 'title-align-right'
				}

				return alignMap[this.titleAlign] || alignMap.left
			},
			hasText() {
				return Boolean(this.eyebrow || this.title || this.subtitle)
			},
			hasContent() {
				return this.hasText || this.showAvatar
			}
		}
	}
</script>

<style>
	.page-top-title {
		width: 100%;
	}

	.title-align-left {
		text-align: left;
	}

	.title-align-center {
		text-align: center;
	}

	.title-align-right {
		text-align: right;
	}
</style>
