<template>
	<picker
		mode="multiSelector"
		:range="pickerRange"
		:value="pickerValue"
		@change="handleChange"
		@columnchange="handleColumnChange"
		@cancel="handleCancel"
	>
		<view class="time-picker" :class="pickerClass">
			<view v-if="showIcon" class="filter-icon">
				<text></text>
				<text></text>
			</view>
			<text>{{ displayText }}</text>
			<text v-if="showArrow" class="time-arrow">›</text>
		</view>
	</picker>
</template>

<script>
	const FORMAT_TOKENS = ['YYYY', 'MM', 'DD', 'HH', 'mm', 'ss']

	export default {
		name: 'TimePicker',
		model: {
			prop: 'modelValue',
			event: 'update:modelValue'
		},
		props: {
			modelValue: {
				type: String,
				default: ''
			},
			value: {
				type: String,
				default: ''
			},
			format: {
				type: String,
				default: 'YYYY-MM'
			},
			placeholder: {
				type: String,
				default: '全部'
			},
			variant: {
				type: String,
				default: 'filter'
			},
			showArrow: {
				type: Boolean,
				default: false
			},
			startYear: {
				type: Number,
				default: 1970
			},
			endYear: {
				type: Number,
				default: 2099
			},
			minDate: {
				type: String,
				default: ''
			},
			maxDate: {
				type: String,
				default: ''
			}
		},
		data() {
			return {
				innerValue: '',
				draftValue: '',
				pickerIndexes: []
			}
		},
		computed: {
			currentValue() {
				return this.innerValue || this.modelValue || this.value || this.getNowByFormat()
			},
			formatTokens() {
				return FORMAT_TOKENS.filter((token) => this.format.includes(token))
			},
			pickerClass() {
				return `time-picker-${this.variant}`
			},
			showIcon() {
				return this.variant === 'filter'
			},
			displayText() {
				return this.currentValue || this.placeholder
			},
			pickerRange() {
				const dateInfo = this.parseValue(this.draftValue || this.currentValue)

				return this.formatTokens.map((token) => this.getColumnRange(token, dateInfo))
			},
			pickerValue() {
				if (this.pickerIndexes.length === this.formatTokens.length) return this.pickerIndexes

				return this.getIndexesByInfo(this.parseValue(this.draftValue || this.currentValue))
			}
		},
		created() {
			this.syncPickerState(this.modelValue || this.value || this.getNowByFormat())
		},
		watch: {
			modelValue(value) {
				if (value !== undefined && value !== this.innerValue) this.syncPickerState(value || this.getNowByFormat())
			},
			value(value) {
				if (value !== undefined && value !== this.innerValue) this.syncPickerState(value || this.getNowByFormat())
			},
			format() {
				this.syncPickerState(this.currentValue)
			},
			minDate() {
				this.syncPickerState(this.currentValue)
			},
			maxDate() {
				this.syncPickerState(this.currentValue)
			}
		},
		methods: {
			syncPickerState(value) {
				const info = this.parseValue(value || this.getNowByFormat())
				const formattedValue = this.formatByInfo(info)

				this.innerValue = formattedValue
				this.draftValue = formattedValue
				this.pickerIndexes = this.getIndexesByInfo(info)
			},
			pad(value) {
				return (`0${String(value)}`).slice(-2)
			},
			getNowInfo() {
				const date = new Date()
				return {
					YYYY: String(date.getFullYear()),
					MM: this.pad(date.getMonth() + 1),
					DD: this.pad(date.getDate()),
					HH: this.pad(date.getHours()),
					mm: this.pad(date.getMinutes()),
					ss: this.pad(date.getSeconds())
				}
			},
			getMinDateInfo() {
				const match = String(this.minDate || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
				if (!match) return null

				return {
					YYYY: match[1],
					MM: this.pad(match[2]),
					DD: this.pad(match[3])
				}
			},
			getMaxDateInfo() {
				const match = String(this.maxDate || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
				if (!match) return null

				return {
					YYYY: match[1],
					MM: this.pad(match[2]),
					DD: this.pad(match[3])
				}
			},
			getNowByFormat() {
				return this.formatByInfo(this.getNowInfo())
			},
			parseValue(value) {
				const info = this.getNowInfo()
				const matches = String(value || '').match(/\d+/g) || []

				this.formatTokens.forEach((token, index) => {
					if (matches[index]) {
						info[token] = token === 'YYYY' ? matches[index] : this.pad(matches[index])
					}
				})

				info.MM = this.clampNumber(info.MM, 1, 12)
				info.DD = this.clampNumber(info.DD, 1, this.getMonthDays(Number(info.YYYY), Number(info.MM)))
				info.HH = this.clampNumber(info.HH, 0, 23)
				info.mm = this.clampNumber(info.mm, 0, 59)
				info.ss = this.clampNumber(info.ss, 0, 59)

				const minInfo = this.getMinDateInfo()
				if (minInfo && Number(info.YYYY) < Number(minInfo.YYYY)) {
					info.YYYY = minInfo.YYYY
					if (this.formatTokens.includes('MM')) info.MM = minInfo.MM
					if (this.formatTokens.includes('DD')) info.DD = minInfo.DD
				} else if (minInfo && info.YYYY === minInfo.YYYY) {
					if (this.formatTokens.includes('MM') && Number(info.MM) < Number(minInfo.MM)) {
						info.MM = minInfo.MM
						if (this.formatTokens.includes('DD')) info.DD = minInfo.DD
					} else if (
						this.formatTokens.includes('MM') &&
						this.formatTokens.includes('DD') &&
						info.MM === minInfo.MM &&
						Number(info.DD) < Number(minInfo.DD)
					) {
						info.DD = minInfo.DD
					}
				}

				const maxInfo = this.getMaxDateInfo()
				if (maxInfo && Number(info.YYYY) > Number(maxInfo.YYYY)) {
					info.YYYY = maxInfo.YYYY
					if (this.formatTokens.includes('MM')) info.MM = maxInfo.MM
					if (this.formatTokens.includes('DD')) info.DD = maxInfo.DD
				} else if (maxInfo && info.YYYY === maxInfo.YYYY) {
					if (this.formatTokens.includes('MM') && Number(info.MM) > Number(maxInfo.MM)) {
						info.MM = maxInfo.MM
						if (this.formatTokens.includes('DD')) info.DD = maxInfo.DD
					} else if (
						this.formatTokens.includes('MM') &&
						this.formatTokens.includes('DD') &&
						info.MM === maxInfo.MM &&
						Number(info.DD) > Number(maxInfo.DD)
					) {
						info.DD = maxInfo.DD
					}
				}

				return info
			},
			clampNumber(value, min, max) {
				return this.pad(Math.min(Math.max(Number(value) || min, min), max))
			},
			getMonthDays(year, month) {
				return new Date(year, month, 0).getDate()
			},
			createNumberList(start, end) {
				const list = []
				for (let item = start; item <= end; item += 1) {
					list.push(this.pad(item))
				}
				return list
			},
			getColumnValues(token, dateInfo) {
				if (token === 'YYYY') {
					const minInfo = this.getMinDateInfo()
					const maxInfo = this.getMaxDateInfo()
					const startYear = minInfo ? Math.max(this.startYear, Number(minInfo.YYYY)) : this.startYear
					const endYear = maxInfo ? Math.min(this.endYear, Number(maxInfo.YYYY)) : this.endYear
					const list = []
					for (let year = startYear; year <= endYear; year += 1) {
						list.push(String(year))
					}
					return list
				}
				if (token === 'MM') {
					const minInfo = this.getMinDateInfo()
					const maxInfo = this.getMaxDateInfo()
					const startMonth = minInfo && dateInfo.YYYY === minInfo.YYYY ? Number(minInfo.MM) : 1
					const endMonth = maxInfo && dateInfo.YYYY === maxInfo.YYYY ? Number(maxInfo.MM) : 12
					return this.createNumberList(startMonth, endMonth)
				}
				if (token === 'DD') {
					const minInfo = this.getMinDateInfo()
					const maxInfo = this.getMaxDateInfo()
					const startDay = minInfo &&
						dateInfo.YYYY === minInfo.YYYY &&
						dateInfo.MM === minInfo.MM
						? Number(minInfo.DD)
						: 1
					const monthDays = this.getMonthDays(Number(dateInfo.YYYY), Number(dateInfo.MM))
					const endDay = maxInfo &&
						dateInfo.YYYY === maxInfo.YYYY &&
						dateInfo.MM === maxInfo.MM
						? Number(maxInfo.DD)
						: monthDays
					return this.createNumberList(startDay, endDay)
				}
				if (token === 'HH') return this.createNumberList(0, 23)
				return this.createNumberList(0, 59)
			},
			getColumnRange(token, dateInfo) {
				const unitMap = {
					YYYY: '年',
					MM: '月',
					DD: '日',
					HH: '时',
					mm: '分',
					ss: '秒'
				}

				return this.getColumnValues(token, dateInfo).map((item) => `${item}${unitMap[token]}`)
			},
			getIndexesByInfo(dateInfo) {
				return this.formatTokens.map((token) => {
					const values = this.getColumnValues(token, dateInfo)
					const index = values.indexOf(dateInfo[token])
					return index > -1 ? index : 0
				})
			},
			normalizeIndexes(indexes) {
				const source = Array.isArray(indexes) ? indexes : []

				return this.formatTokens.map((token, index) => {
					const value = Number(source[index])
					return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
				})
			},
			getInfoByIndexes(indexes, baseValue) {
				const info = this.parseValue(baseValue || this.draftValue || this.currentValue)

				this.formatTokens.forEach((token, columnIndex) => {
					const values = this.getColumnValues(token, info)
					info[token] = values[indexes[columnIndex]] || values[0] || info[token]
				})

				return this.parseValue(this.formatByInfo(info))
			},
			formatByInfo(info) {
				return this.formatTokens.reduce((result, token) => result.replace(token, info[token]), this.format)
			},
			emitValue(value) {
				this.innerValue = value
				this.$emit('update:modelValue', value)
				this.$emit('input', value)
				this.$emit('change', value)
			},
			handleChange(event) {
				const indexes = this.normalizeIndexes(event.detail && event.detail.value)
				const info = this.getInfoByIndexes(indexes)
				const value = this.formatByInfo(info)

				this.emitValue(value)
				this.draftValue = value
				this.pickerIndexes = this.getIndexesByInfo(info)
			},
			handleColumnChange(event) {
				const detail = event && event.detail ? event.detail : {}
				const column = Number(detail.column)
				if (!Number.isInteger(column) || column < 0 || column >= this.formatTokens.length) return

				const indexes = this.normalizeIndexes(this.pickerValue)
				indexes[column] = Math.max(Number(detail.value) || 0, 0)

				const info = this.getInfoByIndexes(indexes)
				this.draftValue = this.formatByInfo(info)
				this.pickerIndexes = this.getIndexesByInfo(info)
			},
			handleCancel() {
				this.draftValue = this.innerValue || this.currentValue
				this.pickerIndexes = this.getIndexesByInfo(this.parseValue(this.draftValue))
			}
		}
	}
</script>

<style>
	.time-picker {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		min-width: 126rpx;
		height: 62rpx;
		padding: 0 24rpx;
		border: 1rpx solid rgba(20, 58, 85, 0.08);
		border-radius: 999rpx;
		background: #fff;
		box-shadow: 0 8rpx 22rpx rgba(20, 58, 85, 0.05);
		box-sizing: border-box;
		font-size: 27rpx;
		font-weight: 600;
		color: #7e8896;
		white-space: nowrap;
	}

	.time-picker-record {
		flex: 1;
		justify-content: flex-end;
		min-width: 0;
		height: 58rpx;
		padding: 0 18rpx;
		border: 0;
		background: #f8f4ed;
		box-shadow: none;
		font-size: 24rpx;
		font-weight: 800;
		color: #143a55;
	}

	.time-arrow {
		font-size: 36rpx;
		font-weight: 300;
		color: #b1a89d;
		line-height: 1;
	}

	.filter-icon {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 7rpx;
		width: 22rpx;
	}

	.filter-icon text {
		display: block;
		height: 2rpx;
		border-radius: 999rpx;
		background: #7e8896;
	}

	.filter-icon text:first-child {
		width: 22rpx;
	}

	.filter-icon text:last-child {
		width: 12rpx;
	}
</style>
