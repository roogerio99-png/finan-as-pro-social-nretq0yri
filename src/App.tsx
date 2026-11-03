import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import { WelcomePage } from './pages/WelcomePage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { ReconciliationPage } from './pages/ReconciliationPage'
import { BudgetPage } from './pages/BudgetPage'
import { DebtsPage } from './pages/DebtsPage'
import { DreamsPage } from './pages/DreamsPage'
import { FamilyPage } from './pages/FamilyPage'
import { CadastrosPage } from './pages/CadastrosPage'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/boas-vindas" element={<WelcomePage />} />
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/lancamentos" element={<TransactionsPage />} />
            <Route path="/conciliacao" element={<ReconciliationPage />} />
            <Route path="/orcamento" element={<BudgetPage />} />
            <Route path="/dividas" element={<DebtsPage />} />
            <Route path="/sonhos" element={<DreamsPage />} />
            <Route path="/familia" element={<FamilyPage />} />
            <Route path="/cadastros" element={<CadastrosPage />} />
            <Route path="/cadastros/:tab" element={<CadastrosPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
