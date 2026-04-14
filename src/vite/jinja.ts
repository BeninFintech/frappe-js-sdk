import { type Plugin } from 'vite'

const BODY_CLOSE_TAG_RE = /<\/body>/

export function jinjaBootData(): Plugin {
  return {
    name: 'jinja-boot-data-plugin',
    apply: 'build',
    transformIndexHtml(html, context) {
      if (!context.server) {
        // context.server is true in dev mode
        // only inject this in production build
        return html.replace(
          BODY_CLOSE_TAG_RE,
          `
          <script>
            {% for key in boot %}
            window["{{ key }}"] = {{ boot[key] | tojson }};
            {% endfor %}
          </script>
          </body>
          `
        )
      }
      return html
    }
  }
}

export default jinjaBootData
