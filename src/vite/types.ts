/**
 * Frappe Types — Vite plugin and standalone generator.
 *
 * Scans Frappe DocType JSON schemas in the surrounding bench and emits a
 * directory of TypeScript declaration files, one per Frappe module, plus a
 * shared base file and an index re-export.
 *
 * Layout produced (default `output: 'src/types/doctypes'`):
 *
 *   src/types/doctypes/
 *   ├── _base.d.ts           DocType, ChildDocType
 *   ├── <module>.d.ts        one file per Frappe module
 *   └── index.d.ts           re-exports everything
 *
 * Usage in vite.config.ts:
 *
 *   import { frappeTypes } from './plugins/frappe-types'
 *
 *   plugins: [
 *     frappeTypes({
 *       input: {
 *         corebanking: ['loan_management', 'savings_management']
 *       }
 *     })
 *   ]
 *
 * To pull every module of an app, pass `['*']`:
 *
 *   frappeTypes({ input: { corebanking: ['*'] } })
 *
 * Then in app code:
 *
 *   import type { LoanApplication } from '~/types/doctypes'              // via index
 *   import type { Loan } from '~/types/doctypes/loan-management'          // direct
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { type Plugin } from 'vite'

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Maps installed Frappe app names → the union of their module folder names.
 *
 * Empty by design. The plugin writes a sibling `frappe-types.generated.d.ts`
 * on each dev-server start that augments this interface via
 * `declare module`, giving `FrappeTypesOptions.input` full autocomplete and
 * typo-checking.
 *
 * When the generated file is missing (fresh clone, no dev run yet) the
 * interface stays empty and `input` falls back to the permissive
 * `Record<string, readonly string[]>` type — the plugin still works, you
 * just don't get narrow autocomplete until the first generation.
 */
export interface FrappeAppMap {}

type _KnownApps = keyof FrappeAppMap
type _ModuleOf<App extends _KnownApps> = FrappeAppMap[App] extends string ? FrappeAppMap[App] : never

/**
 * Narrow input shape derived from the augmented `FrappeAppMap`. `'*'` is
 * always accepted as a wildcard standing for "every module listed in the
 * app's modules.txt".
 *
 * When `FrappeAppMap` is unaugmented (fresh clone before first dev run),
 * `_KnownApps` is `never` and this resolves to `{}` — permissive enough
 * to let `vite.config.ts` type-check before the generated file exists.
 * Once augmented, unknown app keys and invalid module names both become
 * compile errors at the call site.
 */
export type FrappeTypesInput = {
  [App in _KnownApps]?: readonly (_ModuleOf<App> | '*')[]
}

export interface FrappeTypesOptions {
  /**
   * Map of Frappe app name → list of Frappe module names. Module names may
   * be either:
   *   - the snake_case folder name (`loan_management`), or
   *   - the display name from modules.txt (`Loan Management`).
   *
   * Pass the literal `'*'` to include every module listed in the app's
   * `modules.txt`. Every DocType inside each selected module is generated;
   * cross-module Table-child references are followed automatically.
   */
  input: FrappeTypesInput

  /**
   * Output directory for the generated declaration files. Relative paths
   * resolve from the frontend folder (process.cwd()). Defaults to
   * `src/types/doctypes`.
   */
  output?: string

  /**
   * Override bench root discovery (the directory containing both `apps/`
   * and `sites/`). Auto-detected by walking up from cwd if omitted.
   */
  benchPath?: string

  /**
   * Override where the sibling `frappe-types.generated.d.ts` augmentation
   * file is written. Defaults to the plugin's own directory. Primarily
   * useful for tests that don't want to touch the real plugin folder.
   */
  generatedTypesPath?: string
}

export interface GenerationSummary {
  processed: number
  modulesWritten: number
  modulesUnchanged: number
  outputDir: string
  notFound: string[]
  unknownApps: string[]
  installedApps: string[]
}

// -----------------------------------------------------------------------------
// Frappe schema types
// -----------------------------------------------------------------------------

interface DocTypeField {
  fieldname: string
  fieldtype: string
  label?: string
  options?: string
  reqd?: 0 | 1
}

interface DocTypeJson {
  name: string
  modified: string
  module?: string
  istable?: 0 | 1
  fields: DocTypeField[]
}

// -----------------------------------------------------------------------------
// Field-type tables
// -----------------------------------------------------------------------------

const TYPE_MAPPING: Record<string, string> = {
  'Data': 'string',
  'Text': 'string',
  'Small Text': 'string',
  'Long Text': 'string',
  'Text Editor': 'string',
  'Markdown Editor': 'string',
  'HTML Editor': 'string',
  'Code': 'string',
  'JSON': 'string',
  'Link': 'string',
  'Dynamic Link': 'string',
  'Autocomplete': 'string',
  'Read Only': 'string',
  'Password': 'string',
  'Color': 'string',
  'Attach': 'string',
  'Attach Image': 'string',
  'Signature': 'string',
  'Barcode': 'string',
  'Geolocation': 'string',
  'Date': 'string', // "YYYY-MM-DD"
  'Datetime': 'string', // "YYYY-MM-DD HH:MM:SS"
  'Time': 'string', // "HH:MM:SS"
  'Duration': 'string',
  'Int': 'number',
  'Float': 'number',
  'Currency': 'number',
  'Percent': 'number',
  'Rating': 'number',
  'Check': '0 | 1',
  'Table': 'any[]',
  'Table MultiSelect': 'any[]'
}

const SKIP_FIELDTYPES = new Set([
  'Section Break',
  'Column Break',
  'Tab Break',
  'HTML',
  'Button',
  'Fold',
  'Heading',
  'Image'
])

const RELATION_FIELDTYPES = new Set(['Table', 'Table MultiSelect'])

const NON_OPTIONAL_FIELDTYPES = new Set(['Check', 'Table', 'Table MultiSelect'])

const MODULE_FOLDER_RE = /^[a-z0-9_]+$/

// -----------------------------------------------------------------------------
// Bench discovery
// -----------------------------------------------------------------------------

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  }
  catch {
    return false
  }
}

async function findBenchPath(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir)
  while (dir !== path.dirname(dir)) {
    const [hasApps, hasSites] = await Promise.all([
      pathExists(path.join(dir, 'apps')),
      pathExists(path.join(dir, 'sites'))
    ])
    if (hasApps && hasSites)
      return dir
    dir = path.dirname(dir)
  }
  return null
}

// -----------------------------------------------------------------------------
// Module + DocType discovery
// -----------------------------------------------------------------------------

/**
 * Frappe app convention: `apps/<app>/<app>/` is the Python package root that
 * contains `modules.txt` and one folder per module.
 */
function appPackageDir(appsPath: string, app: string): string {
  return path.join(appsPath, app, app)
}

/** Frappe modules live at `apps/<app>/<app>/<module>/`. */
function moduleDir(appsPath: string, app: string, moduleFolder: string): string {
  return path.join(appPackageDir(appsPath, app), moduleFolder)
}

/** Doctype folder: `apps/<app>/<app>/<module>/doctype/<doctype>/`. */
function doctypeFolder(
  appsPath: string,
  app: string,
  moduleFolder: string,
  doctypeName: string
): string {
  return path.join(moduleDir(appsPath, app, moduleFolder), 'doctype', doctypeName)
}

/** "Loan Management" → "loan_management" (Frappe folder convention). */
function toModuleFolder(input: string): string {
  // Already snake_case? Keep as-is. Otherwise convert from display form.
  if (MODULE_FOLDER_RE.test(input))
    return input
  return input.toLowerCase().replaceAll(/\s+/g, '_')
}

/** Reads the app's modules.txt and returns a list of folder-name modules. */
async function readModulesTxt(
  appsPath: string,
  app: string
): Promise<string[]> {
  const modulesTxtPath = path.join(appPackageDir(appsPath, app), 'modules.txt')
  let content: string
  try {
    content = await fs.readFile(modulesTxtPath, 'utf8')
  }
  catch {
    return []
  }
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toModuleFolder)
}

/**
 * Lists every Frappe app installed in the bench. An "app" is a folder under
 * `apps/` whose Python package contains a `modules.txt`.
 */
async function enumerateInstalledApps(appsPath: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(appsPath, { withFileTypes: true })
  }
  catch {
    return []
  }
  const candidates = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .map((e) => e.name)

  // An app qualifies if apps/<app>/<app>/modules.txt exists.
  const checks = await Promise.all(
    candidates.map(async (app) => {
      const ok = await pathExists(
        path.join(appPackageDir(appsPath, app), 'modules.txt')
      )
      return ok ? app : null
    })
  )
  return checks.filter((a): a is string => a !== null).sort()
}

/** Resolves the module list for one app, expanding `'*'` via modules.txt. */
async function resolveModules(
  appsPath: string,
  app: string,
  rawModules: readonly string[]
): Promise<string[]> {
  if (rawModules.includes('*'))
    return readModulesTxt(appsPath, app)
  return rawModules.map(toModuleFolder)
}

/** Lists every DocType folder name inside a module's `doctype/` directory. */
async function listDoctypesInModule(
  appsPath: string,
  app: string,
  moduleFolder: string
): Promise<string[]> {
  const dir = path.join(moduleDir(appsPath, app, moduleFolder), 'doctype')
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  }
  catch {
    return []
  }
  // Only directories; skip __pycache__ and the like.
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name)
}

/** Reads a DocType JSON given its app + module + folder name. */
async function readDoctypeJson(
  appsPath: string,
  app: string,
  moduleFolder: string,
  doctypeName: string
): Promise<DocTypeJson | null> {
  const jsonPath = path.join(
    doctypeFolder(appsPath, app, moduleFolder, doctypeName),
    `${doctypeName}.json`
  )
  if (!(await pathExists(jsonPath)))
    return null
  return JSON.parse(await fs.readFile(jsonPath, 'utf8')) as DocTypeJson
}

/**
 * Cross-module fallback: locate a DocType when its module is unknown by
 * recursively scanning the entire app package. Used only for Table-child
 * references that point outside the explicitly-listed modules.
 */
async function findDoctypeJsonAnywhere(
  appsPath: string,
  app: string,
  doctypeName: string
): Promise<{ jsonPath: string, moduleFolder: string } | null> {
  const appPkg = appPackageDir(appsPath, app)
  if (!(await pathExists(appPkg)))
    return null

  const target = path.join('doctype', doctypeName, `${doctypeName}.json`)
  let entries: string[]
  try {
    entries = await fs.readdir(appPkg, { recursive: true })
  }
  catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.endsWith(target))
      continue
    // entry: "<module>/doctype/<name>/<name>.json"
    const segments = entry.split(path.sep)
    const doctypeIdx = segments.lastIndexOf('doctype')
    const moduleFolder = doctypeIdx > 0 ? segments[doctypeIdx - 1] : null
    if (!moduleFolder)
      continue
    return { jsonPath: path.join(appPkg, entry), moduleFolder }
  }
  return null
}

// -----------------------------------------------------------------------------
// Name normalization
// -----------------------------------------------------------------------------

/** "Loan Application" → "LoanApplication" (TypeScript interface name). */
function toInterfaceName(doctypeLabel: string): string {
  return doctypeLabel.replace(/\s+/g, '')
}

/** "Loan Application Item" → "loan_application_item" (folder name). */
function toFolderName(doctypeLabel: string): string {
  return doctypeLabel.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Kebab-case a module name. Accepts either the JSON's display form
 * ("Loan Management") or the folder form ("loan_management") and produces
 * the same canonical file/import form ("loan-management").
 */
function toFileName(moduleName: string): string {
  return moduleName.toLowerCase().replaceAll(/[\s_]+/g, '-')
}

// -----------------------------------------------------------------------------
// Interface emission
// -----------------------------------------------------------------------------

interface FieldEmission {
  comment: string
  declaration: string
  childDoctype: string | null
}

function emitField(field: DocTypeField): FieldEmission {
  let tsType: string = TYPE_MAPPING[field.fieldtype] ?? 'any'
  let childDoctype: string | null = null

  if (field.fieldtype === 'Select' && field.options) {
    const variants = field.options
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => `'${o.replaceAll('\'', '\\\'')}'`)
    if (variants.length > 0)
      tsType = variants.join(' | ')
  }
  else if (RELATION_FIELDTYPES.has(field.fieldtype) && field.options) {
    childDoctype = field.options
    tsType = `${toInterfaceName(field.options)}[]`
  }

  let comment = `/** ${field.label ?? field.fieldname}: ${field.fieldtype}`
  if (
    (RELATION_FIELDTYPES.has(field.fieldtype)
      || field.fieldtype === 'Link'
      || field.fieldtype === 'Dynamic Link')
    && field.options
  ) {
    comment += ` (${field.options})`
  }
  comment += ' */'

  const optional
    = field.reqd || NON_OPTIONAL_FIELDTYPES.has(field.fieldtype) ? '' : '?'
  const declaration = `  ${field.fieldname}${optional}: ${tsType}`

  return { comment, declaration, childDoctype }
}

interface InterfaceArtifact {
  source: string // the body lines, no imports
  childDoctypeLabels: string[] // raw labels, e.g. ["Loan Application Item"]
}

function buildInterface(doc: DocTypeJson): InterfaceArtifact {
  const interfaceName = toInterfaceName(doc.name)
  const baseType = doc.istable ? 'ChildDocType' : 'DocType'
  const childDoctypeLabels: string[] = []

  const lines: string[] = []
  lines.push(`// Last updated: ${doc.modified}`)
  lines.push(`export interface ${interfaceName} extends ${baseType} {`)

  for (const field of doc.fields) {
    if (SKIP_FIELDTYPES.has(field.fieldtype))
      continue
    const { comment, declaration, childDoctype } = emitField(field)
    if (childDoctype)
      childDoctypeLabels.push(childDoctype)
    lines.push(`  ${comment}`)
    lines.push(declaration)
  }

  lines.push('}')
  return { source: `${lines.join('\n')}\n`, childDoctypeLabels }
}

// -----------------------------------------------------------------------------
// File emission
// -----------------------------------------------------------------------------

const BASE_FILE_CONTENT = `// AUTO-GENERATED by plugins/frappe-types.ts — do not edit by hand.
// Base shapes — every DocType extends these.

export interface DocType {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
}

export interface ChildDocType extends DocType {
  parent?: string
  parentfield?: string
  parenttype?: string
  idx?: number
}
`

interface ModuleBucket {
  /** Display name from the JSON's `module` field, e.g. "Loan Management". */
  label: string
  /** Map of interfaceName → emission artifact */
  interfaces: Map<string, InterfaceArtifact>
}

function emitModuleFile(
  moduleKey: string,
  bucket: ModuleBucket,
  interfaceLocations: Map<string, string>
): string {
  const usesBase = new Set<string>()
  const crossModuleImports = new Map<string, Set<string>>()

  for (const [, art] of bucket.interfaces) {
    if (art.source.includes(' extends DocType'))
      usesBase.add('DocType')
    if (art.source.includes(' extends ChildDocType'))
      usesBase.add('ChildDocType')

    for (const childLabel of art.childDoctypeLabels) {
      const childInterface = toInterfaceName(childLabel)
      const childModule = interfaceLocations.get(childInterface)
      if (!childModule || childModule === moduleKey)
        continue
      if (!crossModuleImports.has(childModule))
        crossModuleImports.set(childModule, new Set())
      crossModuleImports.get(childModule)!.add(childInterface)
    }
  }

  const importLines: string[] = []
  if (usesBase.size > 0) {
    const sorted = [...usesBase].sort()
    importLines.push(`import type { ${sorted.join(', ')} } from './_base'`)
  }
  for (const [otherKey, names] of [...crossModuleImports].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const sortedNames = [...names].sort()
    importLines.push(
      `import type { ${sortedNames.join(', ')} } from './${otherKey}'`
    )
  }

  const sortedInterfaces = [...bucket.interfaces.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )
  const body = sortedInterfaces.map(([, art]) => art.source).join('\n')

  return [
    '// AUTO-GENERATED by plugins/frappe-types.ts — do not edit by hand.',
    `// Module: ${bucket.label}`,
    '',
    ...importLines,
    importLines.length > 0 ? '' : null,
    body
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function emitIndexFile(moduleKeys: string[]): string {
  const lines = [
    '// AUTO-GENERATED by plugins/frappe-types.ts — do not edit by hand.',
    '',
    'export type * from \'./_base\'',
    ...moduleKeys.slice().sort().map((k) => `export type * from './${k}'`)
  ]
  return `${lines.join('\n')}\n`
}

// -----------------------------------------------------------------------------
// Generator
// -----------------------------------------------------------------------------

/**
 * Builds the contents of the sibling `frappe-types.generated.d.ts` that
 * augments `FrappeAppMap` with the real apps + modules installed in the
 * surrounding bench. Committed — CI catches typos.
 */
function emitAppMapFile(appModules: Record<string, string[]>): string {
  const apps = Object.keys(appModules).sort()
  const entries = apps.map((app) => {
    const modules = [...appModules[app]!].sort()
    if (modules.length === 0)
      return `    '${app}': never`
    const union = modules.map((m) => `'${m}'`).join(' | ')
    return `    '${app}': ${union}`
  })

  return [
    '// AUTO-GENERATED by plugins/frappe-types.ts — do not edit by hand.',
    '// Augments FrappeAppMap with the apps + modules present in the bench',
    '// at the time this file was generated. Regenerated on each dev-server',
    '// start; commit it so CI catches typos in vite.config.ts.',
    '/* eslint-disable */',
    '/* prettier-ignore */',
    '// @ts-nocheck',
    '// noinspection JSUnusedGlobalSymbols',
    '// Generated by unplugin-auto-import',
    '// biome-ignore lint: disable',
    '',
    'declare module \'@beninfintech/frappe/vite\' {',
    '  interface FrappeAppMap {',
    ...entries,
    '  }',
    '}',
    '',
    'export {}',
    ''
  ].join('\n')
}

async function writeIfChanged(targetPath: string, content: string): Promise<boolean> {
  let existing: string | null = null

  try {
    existing = await fs.readFile(targetPath, 'utf8')
  }
  catch {
    // missing — fine
  }

  if (existing === content)
    return false

  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, content)

  return true
}

interface PendingDoctype {
  app: string
  doctypeName: string
  moduleFolder: string | null // null → unknown, must search
}

export async function generateDocTypes(
  options: FrappeTypesOptions
): Promise<GenerationSummary> {
  const cwd = process.cwd()
  const outputDir = path.resolve(cwd, options.output ?? 'src/types/doctypes')

  const benchPath = options.benchPath ?? (await findBenchPath(cwd))
  if (!benchPath) {
    throw new Error(
      '[frappe-types] Could not locate a Frappe bench (no parent directory contains both apps/ and sites/).'
    )
  }
  const appsPath = path.join(benchPath, 'apps')

  // Before touching doctypes, refresh the sibling `.generated.d.ts` that
  // augments FrappeAppMap. This gives vite.config.ts autocomplete + typo
  // errors on the NEXT type-check pass.
  const installedApps = await enumerateInstalledApps(appsPath)
  const appModules: Record<string, string[]> = {}
  for (const app of installedApps)
    appModules[app] = await readModulesTxt(appsPath, app)
  const appMapPath = options.generatedTypesPath
    ?? path.join(import.meta.dirname, 'frappe-types.generated.d.ts')
  await writeIfChanged(appMapPath, emitAppMapFile(appModules))

  // Seed the queue from explicit module-level input.
  const queue: PendingDoctype[] = []
  const unknownApps: string[] = []
  for (const [app, rawModules] of Object.entries(options.input)) {
    if (!installedApps.includes(app)) {
      unknownApps.push(app)
      continue
    }
    const modules = await resolveModules(appsPath, app, rawModules as readonly string[])
    for (const moduleFolder of modules) {
      const doctypes = await listDoctypesInModule(appsPath, app, moduleFolder)
      for (const doctypeName of doctypes)
        queue.push({ app, doctypeName, moduleFolder })
    }
  }

  const seen = new Set<string>() // `${app}::${doctypeName}`
  const moduleBuckets = new Map<string, ModuleBucket>()
  const interfaceLocations = new Map<string, string>() // interfaceName → moduleKey
  const notFound: string[] = []

  while (queue.length > 0) {
    const item = queue.shift()!
    const key = `${item.app}::${item.doctypeName}`
    if (seen.has(key))
      continue
    seen.add(key)

    let doc: DocTypeJson | null = null
    let resolvedModuleFolder = item.moduleFolder

    if (resolvedModuleFolder) {
      doc = await readDoctypeJson(appsPath, item.app, resolvedModuleFolder, item.doctypeName)
    }
    if (!doc) {
      // Fallback: cross-module child reference; module unknown.
      const found = await findDoctypeJsonAnywhere(appsPath, item.app, item.doctypeName)
      if (found) {
        try {
          doc = JSON.parse(await fs.readFile(found.jsonPath, 'utf8')) as DocTypeJson
          resolvedModuleFolder = found.moduleFolder
        }
        catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          throw new Error(
            `[frappe-types] Failed to parse ${found.jsonPath}: ${message}`
          )
        }
      }
    }
    if (!doc) {
      notFound.push(`${item.app}/${item.doctypeName}`)
      continue
    }

    // Prefer the JSON's display name ("Loan Management") over the folder
    // ("loan_management"). Both kebab-case to the same key.
    const moduleLabel = doc.module ?? resolvedModuleFolder ?? '_unknown'
    const moduleKey = toFileName(moduleLabel)

    const interfaceName = toInterfaceName(doc.name)
    const artifact = buildInterface(doc)

    let bucket = moduleBuckets.get(moduleKey)
    if (!bucket) {
      bucket = { label: moduleLabel, interfaces: new Map() }
      moduleBuckets.set(moduleKey, bucket)
    }
    bucket.interfaces.set(interfaceName, artifact)
    interfaceLocations.set(interfaceName, moduleKey)

    // Queue Table-child references. We don't know the child's module up
    // front; pass null so the resolver falls back to the recursive search.
    for (const childLabel of artifact.childDoctypeLabels) {
      queue.push({
        app: item.app,
        doctypeName: toFolderName(childLabel),
        moduleFolder: null
      })
    }
  }

  // Emit. Stable ordering = stable diffs.
  let written = 0
  let unchanged = 0

  if (await writeIfChanged(path.join(outputDir, '_base.d.ts'), BASE_FILE_CONTENT))
    written++
  else unchanged++

  for (const [moduleKey, bucket] of moduleBuckets) {
    const filePath = path.join(outputDir, `${moduleKey}.d.ts`)
    const content = emitModuleFile(moduleKey, bucket, interfaceLocations)
    if (await writeIfChanged(filePath, content))
      written++
    else unchanged++
  }

  const indexPath = path.join(outputDir, 'index.d.ts')
  const indexContent = emitIndexFile([...moduleBuckets.keys()])
  if (await writeIfChanged(indexPath, indexContent))
    written++
  else unchanged++

  return {
    processed: interfaceLocations.size,
    modulesWritten: written,
    modulesUnchanged: unchanged,
    outputDir,
    notFound,
    unknownApps,
    installedApps
  }
}

// -----------------------------------------------------------------------------
// Vite plugin
// -----------------------------------------------------------------------------

export function frappeTypes(options: FrappeTypesOptions): Plugin {
  return {
    name: 'frappe-types',
    apply: 'serve', // dev only — production builds shouldn't depend on bench layout
    async configResolved() {
      try {
        const summary = await generateDocTypes(options)
        const rel = path.relative(process.cwd(), summary.outputDir)
        // eslint-disable-next-line no-console
        console.log(
          `[frappe-types] ${summary.processed} interfaces across ${summary.modulesWritten + summary.modulesUnchanged} files in ${rel}/ (${summary.modulesWritten} written, ${summary.modulesUnchanged} unchanged)`
        )
        if (summary.unknownApps.length > 0) {
          console.warn(
            `[frappe-types] unknown apps in input: ${summary.unknownApps.join(', ')} — installed apps are: ${summary.installedApps.join(', ')}`
          )
        }
        if (summary.notFound.length > 0) {
          console.warn(
            `[frappe-types] could not locate: ${summary.notFound.join(', ')}`
          )
        }
      }
      catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[frappe-types] ${message}`)
      }
    }
  }
}

export default frappeTypes

// -----------------------------------------------------------------------------
// Internals exposed for testing. Not part of the public API — may change
// without notice.
// -----------------------------------------------------------------------------

/** @internal */
export const _internals = {
  toInterfaceName,
  toFolderName,
  toFileName,
  toModuleFolder,
  emitField,
  buildInterface,
  emitAppMapFile,
  emitModuleFile,
  emitIndexFile,
  findBenchPath,
  enumerateInstalledApps,
  resolveModules,
  readModulesTxt,
  listDoctypesInModule,
  readDoctypeJson,
  findDoctypeJsonAnywhere
}
