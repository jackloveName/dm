import { request } from '@/common/request.js'

const IMAGE_MIME_TYPES = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	bmp: 'image/bmp',
	heic: 'image/heic',
	heif: 'image/heif'
}

const IMAGE_MIME_EXTENSIONS = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/bmp': 'bmp',
	'image/heic': 'heic',
	'image/heif': 'heif'
}

function getExtension(file, filePath) {
	const mimeType = file && file.type ? String(file.type).toLowerCase() : ''
	if (IMAGE_MIME_EXTENSIONS[mimeType]) return IMAGE_MIME_EXTENSIONS[mimeType]

	const name = (file && file.name) || filePath || ''
	const match = String(name).split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
	return match ? match[1].toLowerCase() : 'jpg'
}

function getMimeType(file, filePath, extension) {
	if (file && file.type && String(file.type).startsWith('image/')) return file.type
	return IMAGE_MIME_TYPES[extension] || 'image/jpeg'
}

function createUploadFileName(extension) {
	return `avatar_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`
}

function withTimeout(promise, timeout, message) {
	return Promise.race([
		promise,
		new Promise((resolve, reject) => {
			setTimeout(() => reject(new Error(message)), timeout)
		})
	])
}

function unwrapPayload(payload) {
	if (Array.isArray(payload)) return payload
	if (!payload || typeof payload !== 'object') return []
	if (Array.isArray(payload.data)) return payload.data
	if (Array.isArray(payload.repData)) return payload.repData
	if (Array.isArray(payload.list)) return payload.list
	if (Array.isArray(payload.rows)) return payload.rows
	return [payload]
}

async function getPresignedFile(fileName) {
	const payload = await request({
		url: `/mall_biz/ua/oss/get_batch_pre_sign_url?fileNames=${encodeURIComponent(fileName)}`,
		method: 'GET'
	})
	const item = unwrapPayload(payload).find((entry) => entry && (entry.preSignUrl || entry.preSignedUrl))
	if (!item) throw new Error('获取上传地址失败')

	return {
		fileName: item.fileName || fileName,
		dir: item.dir || '',
		preSignUrl: item.preSignUrl || item.preSignedUrl
	}
}

function requestWithArrayBuffer(url, arrayBuffer, contentType) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'PUT',
			data: arrayBuffer,
			header: { 'Content-Type': contentType },
			timeout: 60000,
			success: (response) => {
				if (response.statusCode >= 200 && response.statusCode < 300) {
					resolve(response)
					return
				}
				reject(new Error(`文件上传失败（${response.statusCode}）`))
			},
			fail: () => reject(new Error('文件上传失败，请检查网络'))
		})
	})
}

function readAppFile(filePath) {
	const readPromise = new Promise((resolve, reject) => {
		plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
			entry.file((file) => {
				const reader = new plus.io.FileReader()
				reader.onload = (event) => {
					try {
						const result = String(event && event.target && event.target.result || '')
						const base64 = result.includes(',') ? result.split(',')[1] : result
						if (!base64) throw new Error('读取图片失败')
						resolve(uni.base64ToArrayBuffer(base64))
					} catch (error) {
						reject(error)
					}
				}
				reader.onerror = () => reject(new Error('读取图片失败'))
				reader.readAsDataURL(file)
			})
		}, () => reject(new Error('读取图片失败')))
	})
	return withTimeout(readPromise, 15000, '读取图片超时，请重新选择图片')
}

function readMiniProgramFile(filePath) {
	return new Promise((resolve, reject) => {
		uni.getFileSystemManager().readFile({
			filePath,
			success: (res) => resolve(res.data),
			fail: () => reject(new Error('读取图片失败'))
		})
	})
}

async function putFileToOss(preSignUrl, file, filePath, contentType) {
	if (typeof fetch !== 'undefined' && /^blob:/i.test(String(filePath || ''))) {
		const localResponse = await fetch(filePath)
		if (!localResponse.ok) throw new Error('读取图片失败')
		const response = await fetch(preSignUrl, {
			method: 'PUT',
			headers: { 'Content-Type': contentType },
			body: await localResponse.blob()
		})
		if (!response.ok) throw new Error(`文件上传失败（${response.status}）`)
		return
	}

	if (typeof fetch !== 'undefined' && file && typeof File !== 'undefined' && file instanceof File) {
		const response = await fetch(preSignUrl, {
			method: 'PUT',
			headers: { 'Content-Type': contentType },
			body: file
		})
		if (!response.ok) throw new Error(`文件上传失败（${response.status}）`)
		return
	}

	let arrayBuffer
	if (typeof plus !== 'undefined' && plus.io) {
		arrayBuffer = await readAppFile(filePath)
	} else if (uni.getFileSystemManager) {
		arrayBuffer = await readMiniProgramFile(filePath)
	} else if (file && file.arrayBuffer) {
		arrayBuffer = await file.arrayBuffer()
	} else {
		throw new Error('当前环境不支持文件上传')
	}

	await requestWithArrayBuffer(preSignUrl, arrayBuffer, contentType)
}

function getOssFileUrl(preSignUrl) {
	return String(preSignUrl || '').split('?')[0]
}

function getPlatformFilePath(payload) {
	const item = unwrapPayload(payload).find((entry) => entry && (entry.filePath || entry.fileUrl || entry.url || entry.path))
	return item ? (item.filePath || item.fileUrl || item.url || item.path) : ''
}

export async function uploadAvatarFile(file, filePath) {
	const extension = getExtension(file, filePath)
	const contentType = getMimeType(file, filePath, extension)
	const uploadFileName = createUploadFileName(extension)
	const presignedFile = await getPresignedFile(uploadFileName)

	await putFileToOss(presignedFile.preSignUrl, file, filePath, contentType)

	const ossFileUrl = getOssFileUrl(presignedFile.preSignUrl)
	const platformFileName = presignedFile.fileName || uploadFileName
	const payload = await request({
		url: '/mall_biz/attach_file/save_to_platform',
		method: 'POST',
		data: [{
			type: 0,
			fileType: extension,
			fileName: platformFileName,
			filePath: ossFileUrl,
			fileSize: file && file.size ? file.size : 0
		}]
	})

	return getPlatformFilePath(payload) || ossFileUrl
}
