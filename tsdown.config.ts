import { defineConfig } from 'tsdown'
import ApiSnapshot from 'tsnapi/rolldown'

export default defineConfig({
  entry: [
    'src/index.ts'
  ],
  dts: true,
  exports: true,
  publint: true,
  plugins: [
    ApiSnapshot({
      // TODO: remove this when the library is stable to guard against breaking changes
      // eslint-disable-next-line node/prefer-global/process
      update: !process.env.CI
    })
  ]
})
