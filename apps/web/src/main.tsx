import '@mantine/core/styles.css'
import './app/style.css'
import { MantineProvider } from '@mantine/core'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { connect } from './shared/api'

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент приложения')
const root = createRoot(container)
connect()
  .then((auth) =>
    root.render(
      <MantineProvider theme={{ primaryColor: 'teal' }}>
        <BrowserRouter>
          <App auth={auth} />
        </BrowserRouter>
      </MantineProvider>,
    ),
  )
  .catch(() =>
    root.render(
      <main role="alert">
        API недоступен. Проверьте, что Fastify запущен, и обновите страницу.
      </main>,
    ),
  )
