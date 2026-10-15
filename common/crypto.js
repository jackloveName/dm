/*
 *
 *
 * https://www.mall.com/
 *
 * 未经允许，不可做商业用途！
 *
 * 版权所有，侵权必究！
 */

import CryptoJS from 'crypto-js'
// 加密
// key
const keyStr = [
  '-mall--password-', // 登录
  'cloudPayPassword' // 支付
] // 解密用的key
/**
 * 订单支付
 * @param {String} word 加密内容
 * @param {Number} keyIndex 使用key
 * @param {Number} addTime 是否拼接时间戳
*/
export function encrypt (word, keyIndex = 0) {
  const time = Date.now()
  const key = CryptoJS.enc.Utf8.parse(keyStr[keyIndex])
  const srcs = CryptoJS.enc.Utf8.parse(time + word) // 加密方式: 时间戳 + 密文
  const encrypted = CryptoJS.AES.encrypt(srcs, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 })
  return encrypted.toString()
}
