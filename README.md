# @beninfintech/frappe

TypeScript/JavaScript library for a [Frappe Framework](https://frappeframework.com) backend.

<br />
<p align="center">
  <a href="https://github.com/beninfintech/frappe-js-sdk"><img src="https://img.shields.io/maintenance/yes/2026?style=flat-square" alt="Maintenance status" /></a>
  <a href="https://github.com/beninfintech/frappe-js-sdk"><img src="https://img.shields.io/github/license/beninfintech/frappe-js-sdk?style=flat-square" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@beninfintech/frappe"><img src="https://img.shields.io/npm/v/@beninfintech/frappe?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@beninfintech/frappe"><img src="https://img.shields.io/npm/dw/@beninfintech/frappe?style=flat-square" alt="npm downloads" /></a>
</p>

## Features

- REST API client (auth, database CRUD, file upload, RPC calls)
- Vite plugin suite for Frappe app development (proxy, build config, Jinja boot data, DocType type generation)
- Full TypeScript support
- Token-based and cookie-based authentication

The library uses [Axios](https://axios-http.com) under the hood to make API calls to your Frappe backend.

## Installation

```bash
pnpm add @beninfintech/frappe
```

## REST API Client

### Initializing the library

```ts
import { FrappeApp } from '@beninfintech/frappe'

const frappe = new FrappeApp('https://test.frappe.cloud')
```

With token-based authentication (OAuth bearer tokens or API key/secret pairs):

```ts
import { FrappeApp } from '@beninfintech/frappe'

const frappe = new FrappeApp('https://test.frappe.cloud', {
  useToken: true,
  token: () => localStorage.getItem('token') ?? '',
  type: 'Bearer'
})
```

### Authentication

```ts
const auth = frappe.auth()

// Login
auth
  .loginWithUsernamePassword({ username: 'admin', password: 'my-password' })
  .then((response) => console.log('Logged in'))
  .catch((error) => console.error(error))

// Get currently logged in user
auth
  .getLoggedInUser()
  .then((user) => console.log(`User ${user} is logged in.`))
  .catch((error) => console.error(error))

// Logout
auth
  .logout()
  .then(() => console.log('Logged out.'))
  .catch((error) => console.error(error))

// Forget password
auth
  .forgetPassword('example@example.com')
  .then(() => console.log('Password Reset Email Sent!'))
  .catch(() => console.error('Account not found.'))
```

### Database

```ts
const db = frappe.db()
```

#### Fetch a document

```ts
db.getDoc('ToDo', 'TODO-001')
  .then((doc) => console.log(doc))
  .catch((error) => console.error(error))
```

#### Fetch a list of documents

```ts
db.getDocList('ToDo', {
  fields: ['name', 'creation'],
  filters: [['creation', '>', '2021-10-09']],
  orFilters: [],
  limit_start: 5,
  limit: 10,
  orderBy: {
    field: 'creation',
    order: 'desc'
  },
  groupBy: 'name',
  asDict: false
})
  .then((docs) => console.log(docs))
  .catch((error) => console.error(error))
```

#### Create, update, delete

```ts
// Create
db.createDoc('ToDo', { description: 'New task' })

// Update
db.updateDoc('ToDo', 'TODO-001', { description: 'Updated task' })

// Delete
db.deleteDoc('ToDo', 'TODO-001')

// Rename
db.renameDoc('ToDo', 'Old Name', 'New Name')
```

#### Other operations

```ts
// Get document count with filters
db.getCount('ToDo', [['status', '=', 'Open']])

// Get / set field values
db.getValue('ToDo', 'description', [['name', '=', 'TODO-001']])
db.setValue('ToDo', 'TODO-001', 'status', 'Closed')

// Single doctype value
db.getSingleValue('Website Settings', 'home_page')

// Submit / cancel workflow
db.submit(doc)
db.cancel('Sales Invoice', 'INV-001')
```

### API Calls

```ts
const call = frappe.call()

// GET
call.get('frappe.desk.search_link', { doctype: 'Currency', txt: 'IN' })

// POST
call.post('frappe.client.set_value', { doctype: 'User', name: 'Administrator', fieldname: 'interest', value: 'Frappe' })

// PUT
call.put('frappe.client.set_value', { doctype: 'User', name: 'Administrator', fieldname: 'interest', value: 'Frappe' })

// DELETE
call.delete('frappe.client.delete', { doctype: 'Tag', name: 'Random Tag' })
```

### File Uploads

```ts
const file = frappe.file()

file.uploadFile(
  myFile,
  {
    isPrivate: true,
    folder: 'Home',
    doctype: 'User',
    docname: 'Administrator',
    fieldname: 'image'
  },
  (completedBytes, totalBytes) => console.log(Math.round((completedBytes / totalBytes) * 100), '% completed')
)
```

### TypeScript Support

All methods accept generic type parameters:

```ts
interface MyDoc {
  description: string
  status: 'Open' | 'Closed'
}

const doc = await db.getDoc<MyDoc>('ToDo', 'TODO-001')
// doc is FrappeDoc<MyDoc> with full autocomplete
```

## Vite Plugin

The package includes a Vite plugin suite at `@beninfintech/frappe/vite` for Frappe app frontend development.

### Quick start

Use the unified `frappe()` plugin which composes all sub-plugins:

```ts
import { frappe } from '@beninfintech/frappe/vite'

export default defineConfig({
  plugins: [
    ...frappe({
      frontendRoute: '/app'
    })
  ]
})
```

### Options

```ts
frappe({
  // Frontend route path. Passed to the build plugin and defined as __FRONTEND_ROUTE__ global.
  frontendRoute: '/app',

  // Dev proxy plugin. Default: true.
  // Pass false to disable, or an options object to configure.
  proxy: true,

  // Jinja boot data injection. Default: true.
  // Injects Frappe boot data via Jinja templates in production builds.
  jinja: true,

  // Build config plugin. Default: true.
  // Auto-detects output directory, base URL, and copies index.html for Frappe routing.
  build: true,

  // DocType TypeScript type generation. Default: disabled.
  // Pass options to enable.
  types: {
    input: { myapp: ['loan_management', 'savings_management'] }
  }
})
```

### Using plugins individually

Each plugin is also exported separately for fine-grained control:

```ts
import { buildConfig, frappeProxy, frappeTypes, jinjaBootData } from '@beninfintech/frappe/vite'

export default defineConfig({
  plugins: [
    frappeProxy({ port: 8080 }),
    jinjaBootData(),
    buildConfig({ frontendRoute: '/app', sourcemap: false }),
    frappeTypes({ input: { myapp: ['*'] } })
  ]
})
```

### Proxy plugin

Proxies Frappe backend routes (`/api`, `/app`, `/assets`, etc.) to your local Frappe dev server.

```ts
frappeProxy({
  // Vite dev server port. Auto-calculated from Frappe's webserver_port if omitted.
  port: 8080,
  // Regex pattern for routes to proxy. Default covers all standard Frappe routes.
  source: '^/(desk|app|login|api|assets|files|private)'
})
```

The plugin reads `common_site_config.json` from the bench to determine the backend port, or uses the `FRAPPE_WEB_SERVER_PORT` environment variable.

### Build config plugin

Configures Vite's build output for Frappe app deployment.

```ts
buildConfig({
  // Output directory. Auto-detected from Frappe app structure if omitted.
  outDir: '../myapp/public/frontend',
  // Path to copy index.html to for Frappe's www/ routing.
  indexHtmlPath: '../myapp/www/app.html',
  // Or derive it from the frontend route:
  frontendRoute: '/app',
  // Base URL for assets. Auto-detected from outDir if omitted.
  baseUrl: '/assets/myapp/frontend/',
  // Sourcemaps. Default: true.
  sourcemap: true,
  // Empty output directory before build. Default: true.
  emptyOutDir: true
})
```

### Jinja boot data plugin

Injects Frappe boot data into the HTML during production builds via Jinja templates:

```ts
jinjaBootData()
```

This transforms the built `index.html` to include:

```html
<script>
  {% for key in boot %}
  window["{{ key }}"] = {{ boot[key] | tojson }};
  {% endfor %}
</script>
```

### DocType type generation plugin

Scans Frappe DocType JSON schemas from the bench and generates TypeScript declaration files.

```ts
frappeTypes({
  // Map of Frappe app name to list of module names.
  // Use '*' to include all modules from an app.
  input: {
    myapp: ['loan_management', 'savings_management'],
    frappe: ['*']
  },
  // Output directory. Default: 'src/types/doctypes'.
  output: 'src/types/doctypes',
  // Override bench path. Auto-detected by default.
  benchPath: '/path/to/bench'
})
```

This generates:

```
src/types/doctypes/
  _base.d.ts           # DocType, ChildDocType base interfaces
  loan-management.d.ts  # One file per module
  index.d.ts           # Re-exports everything
```

Then in your app code:

```ts
import { type LoanApplication } from '~/types/doctypes'
```

### Utility functions

The following Frappe bench utility functions are also exported from `@beninfintech/frappe/vite`:

```ts
import {
  findAppName,
  findAppsFolder,
  findBenchPath,
  getCommonSiteConfig,
  getConfig,
  getInstalledAppSites
} from '@beninfintech/frappe/vite'
```

## License

See [LICENSE](./LICENSE).
