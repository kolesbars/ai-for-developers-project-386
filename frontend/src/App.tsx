import { Route, Routes } from 'react-router'
import { BookingPrototype } from './prototype/BookingPrototype'
import { OwnerPrototype } from './prototype/OwnerPrototype'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { bookingRoute, homePath } from './routes'

export function App() {
  return (
    <Routes>
      <Route path={homePath} element={<HomePage />} />
      <Route path={bookingRoute} element={<BookingPrototype />} />
      <Route path="/admin" element={<OwnerPrototype />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
