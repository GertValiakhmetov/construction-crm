import '@mantine/core/styles.css'
import { MantineProvider, Container, Text, Title } from '@mantine/core'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import type { Health } from '@crm/contracts'

async function getHealth(): Promise<Health> {
  const response = await fetch('/api/health')
  if (!response.ok) throw new Error('Ошибка запроса к API')
  return response.json()
}

function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth })
  let status = 'Проверяем соединение с API…'
  if (health.isError) status = 'Не удалось подключиться к API'
  else if (health.data?.status === 'ok') status = 'API доступен'

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Объекты и задачи</Title>
      <Text mt="sm" role="status">{status}</Text>
    </Container>
  )
}

const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes><Route path="/" element={<Home />} /></Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </MantineProvider>,
)
