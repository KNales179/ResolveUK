import { useState } from 'react'
import './App.css'
import { ReportForm } from './components/ReportForm'
import { ReportList } from './components/ReportList'

type Tab = 'submit' | 'reports'

function App() {
  const [tab, setTab] = useState<Tab>('submit')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <img src="/logo.png" alt="Resolve UK" className="logo" />
        <p>Report environmental issues in your area.</p>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={tab === 'submit' ? 'tab active' : 'tab'}
          onClick={() => setTab('submit')}
        >
          Submit
        </button>
        <button
          type="button"
          className={tab === 'reports' ? 'tab active' : 'tab'}
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
      </nav>

      <main>
        {tab === 'submit' ? (
          <ReportForm
            onSubmitted={() => {
              setRefreshKey((k) => k + 1)
              setTab('reports')
            }}
          />
        ) : (
          <ReportList refreshKey={refreshKey} />
        )}
      </main>
    </div>
  )
}

export default App
