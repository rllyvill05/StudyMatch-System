import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function MainLayout() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F3F4F6' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
