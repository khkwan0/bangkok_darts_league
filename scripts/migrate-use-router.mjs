/**
 * Codemod: replace module-level `router` from expo-router with `useRouter()`.
 * Surgical text edits (preserves formatting). Uses Babel only for analysis.
 *
 * Usage: node scripts/migrate-use-router.mjs [--dry] [rootDir]
 */
import fs from 'node:fs'
import path from 'node:path'
import {parse} from '@babel/parser'
import _traverse from '@babel/traverse'
import * as t from '@babel/types'

const traverse = _traverse.default ?? _traverse

const dry = process.argv.includes('--dry')
const args = process.argv.slice(2).filter(a => a !== '--dry')
const root = path.resolve(args[0] || 'src')

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx'])

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (EXT.has(path.extname(ent.name))) out.push(p)
  }
  return out
}

function parseFile(code, filename) {
  return parse(code, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'decorators-legacy',
      'importAssertions',
    ],
    sourceFilename: filename,
    errorRecovery: false,
  })
}

function isComponentishName(name) {
  if (!name) return false
  return /^use[A-Z]/.test(name) || /^[A-Z]/.test(name)
}

function functionName(path) {
  if (path.node.id?.name) return path.node.id.name
  if (path.parentPath?.isVariableDeclarator() && path.parentPath.node.id?.name) {
    return path.parentPath.node.id.name
  }
  if (path.parentPath?.isExportDefaultDeclaration()) return 'default'
  return null
}

function isReactFunction(path) {
  const name = functionName(path)
  if (name === 'default') return true
  if (name && isComponentishName(name)) return true
  return false
}

function usesModuleRouter(fnPath) {
  let found = false
  fnPath.traverse({
    Identifier(p) {
      if (p.node.name !== 'router') return
      if (p.parentPath.isImportSpecifier()) return
      if (
        p.parentPath.isObjectProperty() &&
        p.parent.key === p.node &&
        !p.parent.computed
      ) {
        return
      }
      const binding = p.scope.getBinding('router')
      if (!binding || binding.kind === 'module') {
        found = true
        p.stop()
      }
    },
  })
  return found
}

function alreadyHasHook(fnPath) {
  const body = fnPath.node.body
  if (!t.isBlockStatement(body)) return false
  return body.body.some(
    stmt =>
      t.isVariableDeclaration(stmt) &&
      stmt.declarations.some(
        d =>
          t.isIdentifier(d.id, {name: 'router'}) &&
          t.isCallExpression(d.init) &&
          t.isIdentifier(d.init.callee, {name: 'useRouter'}),
      ),
  )
}

function rewriteExpoRouterImport(code) {
  let changed = false
  const next = code.replace(
    /import\s*\{([^}]*)\}\s*from\s*(['"]expo-router['"])/g,
    (full, imports, quote) => {
      if (!/(^|[\s,])router(\s|,|$)/.test(imports)) return full
      changed = true
      let parts = imports
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const hasUseRouter = parts.some(p => {
        const name = p.split(/\s+as\s+/).pop().trim()
        return name === 'useRouter' || p.startsWith('useRouter')
      })
      parts = parts.filter(p => {
        const imported = p.split(/\s+as\s+/)[0].trim()
        return imported !== 'router'
      })
      if (!hasUseRouter) parts.push('useRouter')
      // Keep `type X` imports stable-ish: put type imports first if present
      const typeParts = parts.filter(p => p.startsWith('type '))
      const valueParts = parts.filter(p => !p.startsWith('type '))
      const joined = [...valueParts, ...typeParts].join(', ')
      return `import {${joined}} from ${quote}`
    },
  )
  return {code: next, changed}
}

function analyze(code, filename) {
  const ast = parseFile(code, filename)
  const injectAt = [] // {line (1-based of '{'), column (0-based), name}
  const manual = []

  const topLevelFns = []
  traverse(ast, {
    Function(path) {
      if (path.isClassMethod() || path.isObjectMethod()) return
      if (path.findParent(p => p.isFunction())) return
      topLevelFns.push(path)
    },
  })

  for (const fnPath of topLevelFns) {
    if (!usesModuleRouter(fnPath)) continue
    if (alreadyHasHook(fnPath)) continue

    const name = functionName(fnPath)
    const canUseHook = isReactFunction(fnPath) || name === 'default'
    if (!canUseHook) {
      manual.push(`${filename}:${name || 'anonymous'}`)
      continue
    }

    const body = fnPath.node.body
    if (!t.isBlockStatement(body)) {
      manual.push(`${filename}:${name || 'anonymous'}:concise-body`)
      continue
    }

    injectAt.push({
      line: body.loc.start.line,
      column: body.loc.start.column,
      name: name || 'anon',
    })
  }

  return {injectAt, manual}
}

function injectHooks(code, injectAt) {
  if (injectAt.length === 0) return code
  const lines = code.split('\n')
  // Insert from bottom to top so line numbers stay valid
  const sorted = [...injectAt].sort((a, b) => b.line - a.line || b.column - a.column)
  for (const loc of sorted) {
    const idx = loc.line - 1
    const line = lines[idx]
    const braceAt = line.indexOf('{', loc.column)
    const insertLine = '  const router = useRouter()'
    if (braceAt >= 0 && line.slice(braceAt + 1).trim() === '') {
      // `{` alone on rest of line — insert on next line
      lines.splice(idx + 1, 0, insertLine)
    } else if (braceAt >= 0) {
      // `{` mid-line with code after — split
      const before = line.slice(0, braceAt + 1)
      const after = line.slice(braceAt + 1)
      lines[idx] = before
      lines.splice(idx + 1, 0, insertLine, after)
    } else {
      lines.splice(idx + 1, 0, insertLine)
    }
  }
  return lines.join('\n')
}

const files = walk(root)
let changed = 0
const manualAll = []

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8')
  if (
    !/import\s*\{[^}]*\brouter\b[^}]*\}\s*from\s*['"]expo-router['"]/s.test(
      original,
    )
  ) {
    continue
  }

  const {code: afterImport, changed: importChanged} =
    rewriteExpoRouterImport(original)
  if (!importChanged) continue

  let analysis
  try {
    // Analyze against ORIGINAL so loc maps to original lines; but import
    // rewrite usually doesn't shift function body lines (same line count if
    // import stays one line). Re-analyze afterImport for safety.
    analysis = analyze(afterImport, file)
  } catch (e) {
    console.error('FAIL parse', path.relative(process.cwd(), file), e.message)
    continue
  }

  const next = injectHooks(afterImport, analysis.injectAt)
  if (analysis.manual.length) manualAll.push(...analysis.manual)

  if (next !== original) {
    if (!dry) fs.writeFileSync(file, next)
    changed++
    console.log(
      `${dry ? 'DRY ' : ''}${path.relative(process.cwd(), file)} (+${analysis.injectAt.length} hooks)`,
    )
  }
}

console.log(`\nDone: ${changed} files${dry ? ' (dry run)' : ''}`)
if (manualAll.length) {
  console.log('Manual follow-up:')
  for (const m of [...new Set(manualAll)]) console.log(' -', m)
}
