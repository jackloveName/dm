export function openAddOnePage() {
	uni.navigateTo({
		url: '/pages/addOne/index',
		fail: () => {
			// #ifdef H5
			if (typeof window !== 'undefined') {
				window.location.hash = '/pages/addOne/index'
			}
			// #endif
		}
	})
}
