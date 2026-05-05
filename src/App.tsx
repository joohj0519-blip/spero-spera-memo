import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FloatingFrame } from './components/FloatingFrame'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Detail from './pages/Detail'
import All from './pages/All'
import CalendarView from './pages/Calendar'
import Profile from './pages/Profile'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <FloatingFrame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<Editor />} />
          <Route path="/memo/:id" element={<Detail />} />
          <Route path="/memo/:id/edit" element={<Editor />} />
          <Route path="/all" element={<All />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </FloatingFrame>
    </BrowserRouter>
  )
}
