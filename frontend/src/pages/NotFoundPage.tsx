import { Anchor, Container, Stack, Title } from '@mantine/core'
import { Link } from 'react-router'
import { homePath } from '../routes'

export function NotFoundPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1}>Страница не найдена</Title>
        <Anchor component={Link} to={homePath}>
          На главную
        </Anchor>
      </Stack>
    </Container>
  )
}
