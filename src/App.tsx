import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
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
      <div className="mx-auto max-w-[480px] min-h-screen relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<Editor />} />
          <Route path="/memo/:id" element={<Detail />} />
          <Route path="/memo/:id/edit" element={<Editor />} />
          <Route path="/all" element={<All />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
