import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['scripts/check.mjs'], {
		stdio: 'inherit',
		cwd: process.cwd()
})

if (result.status !== 0) process.exit(result.status || 1)
console.log('Build validation completed')
