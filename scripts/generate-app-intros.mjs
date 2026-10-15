import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'static', 'previews')
const iconPath = path.join(root, 'static', 'app-icon.png')
const outputDir = path.join(root, 'output', 'app-intros')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const canvas = { width: 1242, height: 2688 }
const preview = { width: 940, x: 151, y: 608 }
const screens = [
	{
		name: '01-home',
		file: 'preview-01-home.png',
		kicker: 'PAYDAY-CENTERED MONEY MANAGEMENT',
		title: '跟着发薪日，安排这一周期的钱',
		subtitle: '结余、流水和固定预留，都按同一个周期归位。',
		accent: '#E8B4BC',
		mark: '周期总览'
	},
	{
		name: '02-payday',
		file: 'preview-02-payday.png',
		kicker: 'SET YOUR PAYDAY',
		title: '先把固定支出留住，再安排每天怎么花',
		subtitle: '按发薪日划分预算周期，展示剩余额度与日均可用。',
		accent: '#B59EC2',
		mark: '周期预算'
	},
	{
		name: '03-subscriptions',
		file: 'preview-03-subscriptions.png',
		kicker: 'KNOW THE NEXT CHARGE',
		title: '把自动扣费排在一起，续费前心里有数',
		subtitle: '按月均支出、扣费日和周期查看订阅安排。',
		accent: '#7FB9A6',
		mark: '扣费日历'
	},
	{
		name: '04-aa',
		file: 'preview-04-aa.png',
		kicker: 'SHARED BILLS, CLEAR PROGRESS',
		title: '共同支出按人拆清楚，进度和待收一眼可见',
		subtitle: '聚餐、房租等共同费用按人数计算，并区分进行中与已结算。',
		accent: '#D4B896',
		mark: '共同分账'
	},
	{
		name: '05-shell',
		file: 'preview-05-shell.png',
		kicker: 'RECORD, GROW, KEEP GOING',
		title: '连续记录会留下成长，也会点亮新的徽章',
		subtitle: '每笔记录积累经验，连续记账还有额外加成。',
		accent: '#22B8D6',
		mark: '记录成长'
	}
]

function dataUri(filePath, mimeType) {
	return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}

function createHtml(screen, previewUri, iconUri) {
	const title = escapeHtml(screen.title)
	const subtitle = escapeHtml(screen.subtitle)
	const kicker = escapeHtml(screen.kicker)
	const mark = escapeHtml(screen.mark)

	return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${canvas.width}, initial-scale=1">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: ${canvas.width}px; height: ${canvas.height}px; overflow: hidden; }
body {
  background: #f7f2e8;
  color: #143a55;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
}
.poster {
  position: relative;
  width: ${canvas.width}px;
  height: ${canvas.height}px;
  overflow: hidden;
  background: #f7f2e8;
}
.decor { position: absolute; border: 2px solid rgba(20, 58, 85, 0.08); border-radius: 50%; }
.decor.one { width: 170px; height: 170px; top: 28px; right: 54px; border-color: ${screen.accent}; opacity: .56; }
.decor.two { width: 72px; height: 72px; top: 274px; left: 46px; background: ${screen.accent}; opacity: .18; border: 0; }
.decor.three { width: 118px; height: 118px; bottom: 26px; right: 86px; border-color: rgba(20, 58, 85, .12); }
.brand { position: absolute; top: 82px; left: 88px; display: flex; align-items: center; gap: 20px; }
.brand img { width: 76px; height: 76px; border-radius: 22px; box-shadow: 0 12px 30px rgba(20, 58, 85, .14); }
.brand-name { font-size: 30px; font-weight: 800; letter-spacing: 2px; }
.brand-meta { margin-top: 7px; font-size: 18px; color: #7e8896; letter-spacing: 1px; }
.copy { position: absolute; top: 206px; left: 88px; right: 88px; }
.kicker { font-size: 18px; font-weight: 800; letter-spacing: 3px; color: #4a8b79; }
.title { width: 960px; margin-top: 18px; font-size: 54px; line-height: 1.22; letter-spacing: 0; font-weight: 900; color: #143a55; }
.subtitle { margin-top: 14px; font-size: 26px; line-height: 1.5; color: #52606c; }
.tag { position: absolute; right: 88px; top: 470px; padding: 13px 22px; border-radius: 999px; background: rgba(255, 255, 255, .72); color: #143a55; font-size: 20px; font-weight: 800; box-shadow: 0 10px 24px rgba(20, 58, 85, .06); }
.preview-wrap { position: absolute; left: ${preview.x}px; top: ${preview.y}px; width: ${preview.width}px; height: ${Math.round(2688 * preview.width / 1242)}px; padding: 8px; border-radius: 46px; background: #ffffff; box-shadow: 0 30px 60px rgba(20, 58, 85, .18); }
.preview-wrap img { display: block; width: 100%; height: 100%; border-radius: 38px; object-fit: contain; }
.footer { position: absolute; left: 88px; right: 88px; bottom: 34px; display: flex; align-items: center; justify-content: space-between; color: #7e8896; font-size: 18px; letter-spacing: 1px; }
.footer-line { width: 180px; height: 5px; border-radius: 999px; background: ${screen.accent}; opacity: .72; }
.footer-mark { font-weight: 800; color: #143a55; }
</style>
</head>
<body>
  <main class="poster">
    <div class="decor one"></div>
    <div class="decor two"></div>
    <div class="decor three"></div>
    <div class="brand">
      <img src="${iconUri}" alt="哆米记账">
      <div><div class="brand-name">哆米记账</div><div class="brand-meta">跟着发薪日，安排这一周期的钱</div></div>
    </div>
    <section class="copy"><div class="kicker">${kicker}</div><div class="title">${title}</div><div class="subtitle">${subtitle}</div></section>
    <div class="tag">${mark}</div>
    <div class="preview-wrap"><img src="${previewUri}" alt="${title}"></div>
    <footer class="footer"><div class="footer-line"></div><div>跟发薪日，管好这一周期</div><div class="footer-mark">哆米记账</div></footer>
  </main>
</body>
</html>`
}

if (!fs.existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`)
if (!fs.existsSync(sourceDir)) throw new Error(`Preview directory not found: ${sourceDir}`)

fs.mkdirSync(outputDir, { recursive: true })
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdjz-app-intros-'))
const iconUri = dataUri(iconPath, 'image/png')

try {
	for (const screen of screens) {
		const sourcePath = path.join(sourceDir, screen.file)
		if (!fs.existsSync(sourcePath)) throw new Error(`Missing preview: ${sourcePath}`)

		const htmlPath = path.join(tempDir, `${screen.name}.html`)
		const outputPath = path.join(outputDir, `哆米记账-${screen.name}.png`)
		fs.writeFileSync(htmlPath, createHtml(screen, dataUri(sourcePath, 'image/png'), iconUri), 'utf8')
		const profileDir = path.join(tempDir, `profile-${screen.name}`)
		const result = spawnSync(chromePath, [
			'--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
			'--run-all-compositor-stages-before-draw', '--virtual-time-budget=1200',
			`--user-data-dir=${profileDir}`, '--window-size=1242,2688',
			`--screenshot=${outputPath}`, pathToFileURL(htmlPath).href
		], { encoding: 'utf8', stdio: 'inherit' })

		if (result.status !== 0 || !fs.existsSync(outputPath)) throw new Error(`Failed to render ${screen.name}`)
		console.log(`Rendered ${outputPath}`)
	}
} finally {
	fs.rmSync(tempDir, { recursive: true, force: true })
}

console.log(`Generated ${screens.length} app intro images at ${outputDir}`)
