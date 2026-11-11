import { Route, Routes } from 'react-router'
import { BookingPrototype } from './prototype/BookingPrototype'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { bookingRoute, homePath } from './routes'

export function App() {
  return (
    <Routes>
      <Route path={homePath} element={<HomePage />} />
      <Route path={bookingRoute} element={<BookingPrototype />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
