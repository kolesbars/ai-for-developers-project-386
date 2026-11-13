import { Route, Routes } from 'react-router'
import { AdminPage } from './pages/AdminPage'
import { BookingPage } from './pages/BookingPage'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { adminPath, bookingRoute, confirmationRoute, homePath } from './routes'

export function App() {
  return (
    <Routes>
      <Route path={homePath} element={<HomePage />} />
      <Route path={bookingRoute} element={<BookingPage />} />
      <Route path={confirmationRoute} element={<ConfirmationPage />} />
      <Route path={adminPath} element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
