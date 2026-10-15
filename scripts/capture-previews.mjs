import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'standalone.html')
const outputDir = path.join(root, 'static', 'previews')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screens = [
	{ name: 'home', label: '首页' },
	{ name: 'payday', label: '发薪日周期预算' },
	{ name: 'subscriptions', label: '自动扣费' },
	{ name: 'aa', label: '共同分账' },
	{ name: 'shell', label: '记录成长' }
]

if (!fs.existsSync(chromePath)) {
	throw new Error(`Chrome not found: ${chromePath}`)
}

const source = fs.readFileSync(sourcePath, 'utf8')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdjz-previews-'))
fs.mkdirSync(outputDir, { recursive: true })
fs.cpSync(path.join(root, 'static'), path.join(tempDir, 'static'), { recursive: true })

const previewStyle = `
<style>
html,
body {
\twidth: 414px !important;
\tmin-width: 414px !important;
\tmax-width: 414px !important;
\toverflow-x: hidden !important;
}

body {
\tpadding: 0 !important;
}

.app-frame,
.app-screen {
\twidth: 414px !important;
\tmin-width: 414px !important;
\tmax-width: 414px !important;
}
</style>
`

try {
	for (const [index, screen] of screens.entries()) {
		const html = source
			.replace('</head>', `${previewStyle}\n</head>`)
			.replace('</body>', `\n<script>showScreen('${screen.name}')</script>\n</body>`)
		const htmlPath = path.join(tempDir, `${screen.name}.html`)
		const outputPath = path.join(outputDir, `preview-${String(index + 1).padStart(2, '0')}-${screen.name}.png`)
		const profileDir = path.join(tempDir, `profile-${screen.name}`)
		fs.writeFileSync(htmlPath, html, 'utf8')
		const result = spawnSync(chromePath, [
			'--headless=new',
			'--disable-gpu',
			'--no-sandbox',
			'--hide-scrollbars',
			'--run-all-compositor-stages-before-draw',
			'--virtual-time-budget=800',
			`--user-data-dir=${profileDir}`,
			'--force-device-scale-factor=3',
			'--window-size=414,896',
			`--screenshot=${outputPath}`,
			pathToFileURL(htmlPath).href
		], { encoding: 'utf8', stdio: 'inherit' })
		if (result.status !== 0 || !fs.existsSync(outputPath)) {
			throw new Error(`Failed to capture ${screen.label}`)
		}
		console.log(`Captured ${screen.label}: ${outputPath}`)
	}
} finally {
	fs.rmSync(tempDir, { recursive: true, force: true })
}
