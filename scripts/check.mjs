import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoots = ['App.vue', 'main.js', 'config.js', 'uni.promisify.adaptor.js', 'api', 'common', 'components', 'pages']
const ignoredDirectories = new Set(['node_modules', 'unpackage'])

function collectFiles(entry) {
	const absolute = path.join(root, entry)
	if (fs.statSync(absolute).isFile()) return [absolute]

	const files = []
	for (const item of fs.readdirSync(absolute, { withFileTypes: true })) {
		if (item.isDirectory() && ignoredDirectories.has(item.name)) continue
		const child = path.join(absolute, item.name)
		if (item.isDirectory()) files.push(...collectFiles(path.relative(root, child)))
		else if (/\.(js|vue)$/.test(item.name)) files.push(child)
	}
	return files
}

function extractScript(filePath) {
	const source = fs.readFileSync(filePath, 'utf8')
	if (!filePath.endsWith('.vue')) return source
	const match = source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/)
	return match ? match[1] : ''
}

function checkSyntax(filePath) {
	const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
		input: extractScript(filePath),
		encoding: 'utf8'
	})
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || 'syntax check failed').trim()
		throw new Error(`${path.relative(root, filePath)}\n${detail}`)
	}
}

function checkModalScrollGuards(filePath) {
	if (!filePath.endsWith('.vue')) return
	const source = fs.readFileSync(filePath, 'utf8')
	const viewTags = source.match(/<view\b[^>]*>/g) || []
	const masks = viewTags.filter((tag) => /class="[^"]*(?:mask|dialog-mask)[^"]*"/.test(tag) && /@tap(?:\.stop)?="/.test(tag))
	if (!masks.length) return
	if (masks.some((mask) => !mask.includes('@touchmove.stop.prevent'))) {
		throw new Error(`${path.relative(root, filePath)} contains a modal mask without @touchmove.stop.prevent`)
	}
	const panels = viewTags.filter((tag) => /class="[^"]*(?:panel|dialog-panel)[^"]*"/.test(tag) && /@tap\.stop=/.test(tag))
	if (panels.some((panel) => !panel.includes('@touchmove.stop'))) {
		throw new Error(`${path.relative(root, filePath)} contains a modal panel without @touchmove.stop`)
	}
}

const files = sourceRoots.flatMap(collectFiles)
for (const filePath of files) {
	checkSyntax(filePath)
	checkModalScrollGuards(filePath)
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
for (const scriptName of ['test', 'check', 'build']) {
	if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
		throw new Error(`package.json is missing npm script: ${scriptName}`)
	}
}

console.log(`Checked ${files.length} source files`)
console.log('Build prerequisites and modal scroll guards passed')
