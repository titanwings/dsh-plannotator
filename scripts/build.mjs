import { rm } from 'node:fs/promises'
import { build } from 'esbuild'
import ts from 'typescript'

const PACKAGE_ID = '@dsh-external/dsh-plannotator'

await rm('lib', { recursive: true, force: true })

const program = ts.createProgram({
  rootNames: [
    'src/index.ts',
    'src/client/index.ts',
    'src/client/contracts.ts',
    'src/client/locales.ts',
    'src/client/feedback.ts',
    'src/client/plan-review.ts',
    'src/client/selection.ts',
    'src/client/styles.ts',
    'src/client/PlannotatorPanel.tsx',
    'src/types/dsh.d.ts',
  ],
  options: {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    verbatimModuleSyntax: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: 'lib/types',
    rootDir: 'src',
  },
})
const emit = program.emit()
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emit.diagnostics)
if (diagnostics.length > 0) {
  const host = {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  }
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
  process.exit(1)
}

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outfile: 'lib/index.js',
})

await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  sourcemap: true,
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  banner: {
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

console.log(`[dsh-plannotator] built Host and Web client bundles`)
