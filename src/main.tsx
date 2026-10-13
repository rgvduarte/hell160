import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/instrument-sans'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './styles/global.css'
import './styles/scroll.css'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Races, RaceDetail } from './pages/Races'
import { Register } from './pages/Register'
import { Stay, StayDetail } from './pages/Stay'
import { Host } from './pages/Host'
import { Live } from './pages/Live'
import { Territory } from './pages/Territory'
import { Brand } from './pages/Brand'
import { NotFound } from './pages/NotFound'
import { Cause } from './pages/Cause'
import { Support } from './pages/Support'
import { Account } from './pages/Account'
import { Admin } from './pages/Admin'
import { HostArea } from './pages/HostArea'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="provas" element={<Races />} />
          <Route path="provas/:id" element={<RaceDetail />} />
          <Route path="inscricao" element={<Register />} />
          <Route path="alojamento" element={<Stay />} />
          <Route path="alojamento/anfitriao" element={<Host />} />
          <Route path="alojamento/:id" element={<StayDetail />} />
          <Route path="live" element={<Live />} />
          <Route path="causa" element={<Cause />} />
          <Route path="seguranca" element={<Navigate to="/causa" replace />} />
          <Route path="territorio" element={<Territory />} />
          <Route path="apoiar" element={<Support />} />
          <Route path="parceiros" element={<Navigate to="/apoiar" replace />} />
          <Route path="marca" element={<Brand />} />
          <Route path="conta" element={<Account />} />
          <Route path="organizacao" element={<Admin />} />
          <Route path="anfitriao/:ref" element={<HostArea />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
