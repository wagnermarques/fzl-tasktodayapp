import { existsSync, mkdirSync, symlinkSync, unlinkSync, lstatSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const links = [
  {
    target: resolve(rootDir, 'fzl-fund-ui/appshell-lit'),
    link: resolve(rootDir, 'node_modules/fzl-fund-appshell--lit')
  },
  {
    target: resolve(rootDir, 'fzl-fund-ui/packages/design-tokens'),
    link: resolve(rootDir, 'node_modules/@fzl/design-tokens')
  },
  {
    target: resolve(rootDir, 'fzl-fund-ui/webcomponents-lit'),
    link: resolve(rootDir, 'node_modules/@fzl/webcomponents-lit')
  }
]

for (const { target, link } of links) {
  if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false })) {
    unlinkSync(link)
  }
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(target, link, 'junction')
}
console.log('✔ Submodule workspace symlinks created successfully.')
