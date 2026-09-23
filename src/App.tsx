import { lazy, Suspense } from 'react'
import { PublicGuide } from '@/components/PublicGuide'

const AdminEditor = import.meta.env.DEV
  ? lazy(() => import('@/components/admin/AdminEditor'))
  : null

export default function App() {
  if (import.meta.env.DEV && AdminEditor && window.location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<p className="p-6">Se încarcă studioul de review...</p>}>
        <AdminEditor />
      </Suspense>
    )
  }

  return <PublicGuide />
}
