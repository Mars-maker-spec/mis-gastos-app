import { useState, useMemo, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { supabase } from './supabaseClient'

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | 'login' | 'register'
  | 'dashboard' | 'addExpense' | 'history'
  | 'categories' | 'setLimit' | 'profile'

interface Expense {
  id: string
  description: string
  category: string
  amount: number
  date: string
}

interface User {
  name: string
  email: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Alimentación', 'Transporte', 'Educación',
  'Entretenimiento', 'Salud', 'Otros',
]

const CAT_COLOR: Record<string, string> = {
  'Alimentación':    '#2f6f4e',
  'Transporte':      '#5a9673',
  'Educación':       '#8bc4a0',
  'Entretenimiento': '#c4845a',
  'Salud':           '#5a7c9c',
  'Otros':           '#9c8a5a',
}

const CAT_EMOJI: Record<string, string> = {
  'Alimentación':    '🍽',
  'Transporte':      '🚌',
  'Educación':       '📚',
  'Entretenimiento': '🎬',
  'Salud':           '💊',
  'Otros':           '📦',
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 })

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const currentMonth = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}


// ─── Shared UI ───────────────────────────────────────────────────────────────

function Dots({ className = '' }: { className?: string }) {
  return (
    <div
      className={`border-0 border-t-2 border-dashed my-3 ${className}`}
      style={{ borderColor: 'rgba(47,111,78,0.25)' }}
    />
  )
}

function ReceiptShell({ children, maxW = 'max-w-sm' }: { children: React.ReactNode; maxW?: string }) {
  return (
    <div className={`receipt-top receipt-bottom receipt-paper ${maxW} w-full mx-auto shadow-[3px_6px_24px_rgba(0,0,0,0.12)]`}>
      {children}
    </div>
  )
}

function ReceiptStamp({ label }: { label: string }) {
  return (
    <div className="text-center py-1">
      <span
        className="text-[10px] tracking-[0.25em] uppercase"
        style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.45)' }}
      >
        ✦ {label} ✦
      </span>
    </div>
  )
}

function ReceiptLogo() {
  return (
    <div className="text-center pt-5 pb-1">
      <div
        className="text-[11px] tracking-[0.3em] uppercase mb-1"
        style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}
      >
        ★ MIS GASTOS ★
      </div>
    </div>
  )
}

function InputRow({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label
        className="text-[10px] tracking-widest uppercase block mb-1"
        style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-dashed px-0 py-1 text-sm"
        style={{
          borderColor: 'rgba(47,111,78,0.35)',
          fontFamily: "'Space Mono',monospace",
          color: '#1a3a28',
        }}
      />
    </div>
  )
}

function SelectRow({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="mb-3">
      <label
        className="text-[10px] tracking-widest uppercase block mb-1"
        style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-dashed px-0 py-1 text-sm appearance-none"
        style={{
          borderColor: 'rgba(47,111,78,0.35)',
          fontFamily: "'Space Mono',monospace",
          color: '#1a3a28',
        }}
      >
        <option value="">-- seleccionar --</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function GreenBtn({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 text-sm tracking-widest uppercase transition-all"
      style={{
        fontFamily: "'Space Mono',monospace",
        backgroundColor: disabled ? 'rgba(47,111,78,0.35)' : '#2f6f4e',
        color: '#f6f1e4',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.2em',
      }}
    >
      {label}
    </button>
  )
}

function TextLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs underline underline-offset-2"
      style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}

// ─── Bottom Nav & Sidebar ─────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ id: Screen; label: string; icon: string }> = [
  { id: 'dashboard',  label: 'Inicio',    icon: 'home' },
  { id: 'history',    label: 'Historial', icon: 'list' },
  { id: 'addExpense', label: 'Agregar',   icon: 'plus' },
  { id: 'profile',    label: 'Perfil',    icon: 'user' },
]

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const c = active ? '#2f6f4e' : 'rgba(47,111,78,0.45)'
  if (name === 'home') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
  if (name === 'list') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
  if (name === 'plus') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function BottomNav({ current, onNav }: { current: Screen; onNav: (s: Screen) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex md:hidden border-t"
      style={{ backgroundColor: '#f6f1e4', borderColor: 'rgba(47,111,78,0.2)', zIndex: 50 }}
    >
      {NAV_ITEMS.map(item => {
        const active = current === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <NavIcon name={item.icon} active={active} />
            <span
              className="text-[9px] tracking-wider uppercase"
              style={{
                fontFamily: "'Space Mono',monospace",
                color: active ? '#2f6f4e' : 'rgba(47,111,78,0.45)',
                fontWeight: active ? 700 : 400,
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function Sidebar({ current, onNav, user }: { current: Screen; onNav: (s: Screen) => void; user: User }) {
  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-56"
      style={{ backgroundColor: '#f6f1e4', borderRight: '2px dashed rgba(47,111,78,0.2)', zIndex: 40 }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-dashed" style={{ borderColor: 'rgba(47,111,78,0.2)' }}>
        <div className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>★ MIS GASTOS ★</div>
        <div className="text-lg font-bold leading-tight" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Gestor de<br/>Finanzas</div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3">
        {NAV_ITEMS.map(item => {
          const active = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-1 text-left transition-all"
              style={{
                background: active ? 'rgba(47,111,78,0.1)' : 'transparent',
                border: active ? '1px dashed rgba(47,111,78,0.35)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <NavIcon name={item.icon} active={active} />
              <span
                className="text-xs tracking-widest uppercase"
                style={{
                  fontFamily: "'Space Mono',monospace",
                  color: active ? '#2f6f4e' : 'rgba(47,111,78,0.6)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* User badge */}
      <div className="px-4 py-4 border-t border-dashed" style={{ borderColor: 'rgba(47,111,78,0.2)' }}>
        <div className="text-[9px] tracking-widest uppercase mb-0.5" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>Estudiante</div>
        <div className="text-xs font-bold truncate" style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e' }}>{user.name}</div>
      </div>
    </aside>
  )
}

// ─── SCREEN: Login ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onGoRegister, error, loading }: {
  onLogin: (email: string, pass: string) => void
  onGoRegister: () => void
  error?: string
  loading?: boolean
}) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#e8e2d5' }}>
      <ReceiptShell>
        <ReceiptLogo />
        <div className="px-6 pb-1 text-center">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Iniciar Sesión</h1>
          <p className="text-[11px] mt-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>Accede a tu cuenta</p>
        </div>
        <Dots className="mx-6" />

        {/* Receipt line items */}
        <div className="px-6 pb-2">
          <div className="flex justify-between text-[10px] mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>RECIBO DE ACCESO</span>
            <span>Nº 000001</span>
          </div>
          <InputRow label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="correo@uni.cl" />
          <InputRow label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
        </div>

        <Dots className="mx-6" />

        <div className="px-6 pb-2">
          <div className="flex justify-between text-[10px] py-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>SUBTOTAL</span><span>—</span>
          </div>
          <div className="flex justify-between text-[10px] pb-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>ACCESO</span><span>PERMITIDO</span>
          </div>
        </div>

        <Dots className="mx-6" />

        {error && (
          <div className="px-6 pb-2">
            <p className="text-[10px]" style={{ color: '#c0392b', fontFamily: "'Space Mono',monospace" }}>{error}</p>
          </div>
        )}

        <div className="px-6 pb-5 pt-1">
          <GreenBtn
            label={loading ? 'Ingresando…' : '→ Iniciar Sesión'}
            onClick={() => onLogin(email, pass)}
            disabled={loading || !email || !pass}
          />
          <div className="text-center mt-4">
            <span className="text-[11px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>¿Sin cuenta? </span>
            <TextLink label="Regístrate aquí" onClick={onGoRegister} />
          </div>
        </div>

        <ReceiptStamp label="Mis Gastos · Gestor Estudiantil" />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Register ────────────────────────────────────────────────────────

function RegisterScreen({ onRegister, onGoLogin, error, loading }: {
  onRegister: (name: string, email: string, pass: string) => void
  onGoLogin: () => void
  error?: string
  loading?: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && pass !== confirm

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#e8e2d5' }}>
      <ReceiptShell>
        <ReceiptLogo />
        <div className="px-6 pb-1 text-center">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Nueva Cuenta</h1>
          <p className="text-[11px] mt-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>Únete a Mis Gastos</p>
        </div>
        <Dots className="mx-6" />

        <div className="px-6 pb-2">
          <div className="flex justify-between text-[10px] mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>SOLICITUD DE REGISTRO</span>
            <span>NUEVO</span>
          </div>
          <InputRow label="Nombre completo" value={name} onChange={setName} placeholder="María García" />
          <InputRow label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="correo@uni.cl" />
          <InputRow label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="Mínimo 8 caracteres" />
          <div className="mb-3">
            <label className="text-[10px] tracking-widest uppercase block mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}>
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full bg-transparent border-b border-dashed px-0 py-1 text-sm"
              style={{
                borderColor: mismatch ? '#c0392b' : 'rgba(47,111,78,0.35)',
                fontFamily: "'Space Mono',monospace",
                color: '#1a3a28',
              }}
            />
            {mismatch && <p className="text-[10px] mt-1" style={{ color: '#c0392b', fontFamily: "'Space Mono',monospace" }}>Las contraseñas no coinciden</p>}
          </div>
        </div>

        <Dots className="mx-6" />

        {error && (
          <div className="px-6 pb-2">
            <p className="text-[10px]" style={{ color: '#c0392b', fontFamily: "'Space Mono',monospace" }}>{error}</p>
          </div>
        )}

        <div className="px-6 pb-5 pt-1">
          <GreenBtn
            label={loading ? 'Creando cuenta…' : '→ Registrarme'}
            onClick={() => onRegister(name, email, pass)}
            disabled={loading || mismatch || !name || !email || !pass}
          />
          <div className="text-center mt-4">
            <span className="text-[11px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>¿Ya tienes cuenta? </span>
            <TextLink label="Iniciar sesión" onClick={onGoLogin} />
          </div>
        </div>

        <ReceiptStamp label="Gratis · Para Estudiantes" />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Dashboard ───────────────────────────────────────────────────────

function DashboardScreen({
  expenses, monthlyLimit, user, onNav,
}: {
  expenses: Expense[]; monthlyLimit: number; user: User; onNav: (s: Screen) => void;
}) {
  const ym = currentMonth()
  const thisMonth = expenses.filter(e => e.date.startsWith(ym))
  const total = thisMonth.reduce((s, e) => s + e.amount, 0)
  const pct = Math.min((total / monthlyLimit) * 100, 100)
  const remaining = monthlyLimit - total
  const recent = [...thisMonth].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const overBudget = total > monthlyLimit

  return (
    <div className="py-6 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>
          {today}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>
          Hola, {user.name.split(' ')[0]}
        </h1>
      </div>

      {/* Main receipt card - totals */}
      <ReceiptShell maxW="max-w-2xl">
        <div className="px-6 pt-5">
          <ReceiptStamp label={`Resumen · ${monthLabel(ym)}`} />
          <Dots />

          {/* Total gastado */}
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}>Total gastado</span>
            <span className="text-2xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: overBudget ? '#c0392b' : '#1a3a28' }}>{fmt(total)}</span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 mb-3">
            <div className="flex justify-between text-[9px] mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              <span>0</span>
              <span className={overBudget ? 'text-red-600' : ''}>{overBudget ? '⚠ LÍMITE EXCEDIDO' : `${Math.round(pct)}% del límite`}</span>
              <span>{fmt(monthlyLimit)}</span>
            </div>
            <div className="h-3 border border-dashed" style={{ borderColor: 'rgba(47,111,78,0.3)', backgroundColor: 'rgba(47,111,78,0.06)' }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: overBudget ? '#c0392b' : '#2f6f4e',
                  opacity: 0.75,
                }}
              />
            </div>
          </div>

          <Dots />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 py-2">
            {[
              { label: 'Gastos este mes', value: String(thisMonth.length) },
              { label: 'Restante', value: remaining >= 0 ? fmt(remaining) : fmt(Math.abs(remaining)) },
              { label: 'Límite mensual', value: fmt(monthlyLimit) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-[9px] tracking-wider uppercase mb-0.5" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>{label}</div>
                <div className="text-sm font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{value}</div>
              </div>
            ))}
          </div>

          <Dots />

          {/* Quick actions */}
          <div className="text-[10px] tracking-widest uppercase mb-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>Accesos rápidos</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-1">
            {[
              { label: 'Agregar gasto', screen: 'addExpense' as Screen, icon: '✦' },
              { label: 'Ver historial', screen: 'history' as Screen, icon: '≡' },
              { label: 'Por categoría', screen: 'categories' as Screen, icon: '◎' },
              { label: 'Límite mensual', screen: 'setLimit' as Screen, icon: '⊞' },
            ].map(({ label, screen, icon }) => (
              <button
                key={screen}
                onClick={() => onNav(screen)}
                className="py-3 px-2 text-center border border-dashed transition-all hover:bg-[rgba(47,111,78,0.07)]"
                style={{ borderColor: 'rgba(47,111,78,0.3)', cursor: 'pointer', background: 'none' }}
              >
                <div className="text-base mb-1" style={{ color: '#2f6f4e' }}>{icon}</div>
                <div className="text-[9px] tracking-wider uppercase leading-tight" style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e' }}>{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent expenses */}
        <div className="px-6 pt-2 pb-5">
          <Dots />
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>Últimos gastos</span>
            <TextLink label="Ver todos →" onClick={() => onNav('history')} />
          </div>

          {recent.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.4)' }}>
              Sin gastos este mes
            </p>
          ) : (
            recent.map((e, i) => (
              <div key={e.id}>
                <div className="flex justify-between items-center py-1.5">
                  <div>
                    <div className="text-xs font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{e.description}</div>
                    <div className="text-[9px] mt-0.5" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
                      {CAT_EMOJI[e.category]} {e.category} · {fmtDate(e.date)}
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{fmt(e.amount)}</span>
                </div>
                {i < recent.length - 1 && <div style={{ borderTop: '1px dotted rgba(47,111,78,0.2)' }} />}
              </div>
            ))
          )}

          <Dots />
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>★ TOTAL MES</span>
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{fmt(total)}</span>
          </div>
        </div>

        <ReceiptStamp label={`Generado ${new Date().toLocaleDateString('es-CL')}`} />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Add Expense ─────────────────────────────────────────────────────

function AddExpenseScreen({ onSave, onCancel }: { onSave: (e: Omit<Expense, 'id'>) => void; onCancel: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const canSave = desc.trim() && cat && Number(amount) > 0 && date

  const handleSave = () => {
    if (!canSave) return
    onSave({ description: desc.trim(), category: cat, amount: Number(amount), date })
  }

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Nuevo registro</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Agregar Gasto</h1>
      </div>

      <ReceiptShell maxW="max-w-md">
        <div className="px-6 pt-5">
          <ReceiptStamp label="Boleta de Gasto" />
          <div className="flex justify-between text-[10px] my-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>FECHA EMISIÓN</span><span>{fmtDate(today)}</span>
          </div>
          <Dots />

          <div className="text-[10px] tracking-widest uppercase mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            Detalle del gasto
          </div>

          <InputRow label="Descripción" value={desc} onChange={setDesc} placeholder="Ej: Almuerzo cafetería" />
          <SelectRow label="Categoría" value={cat} onChange={setCat} options={CATEGORIES} />

          {/* Amount row - prominent */}
          <div className="mb-3">
            <label className="text-[10px] tracking-widest uppercase block mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}>
              Monto ($)
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.4)' }}>$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="flex-1 bg-transparent border-b border-dashed py-1 text-2xl font-bold"
                style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
              />
            </div>
          </div>

          <InputRow label="Fecha" type="date" value={date} onChange={setDate} />

          <Dots />

          {/* Preview row */}
          <div className="py-2 space-y-1">
            <div className="flex justify-between text-[10px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              <span>DESCRIPCIÓN</span><span className="truncate max-w-[140px] text-right">{desc || '—'}</span>
            </div>
            <div className="flex justify-between text-[10px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              <span>CATEGORÍA</span><span>{cat ? `${CAT_EMOJI[cat]} ${cat}` : '—'}</span>
            </div>
            <div className="flex justify-between text-[10px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              <span>FECHA</span><span>{date ? fmtDate(date) : '—'}</span>
            </div>
          </div>

          <Dots />

          <div className="flex justify-between items-baseline pb-3">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>★ TOTAL</span>
            <span className="text-2xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>
              {amount ? fmt(Number(amount)) : fmt(0)}
            </span>
          </div>

          <GreenBtn label="✦ Guardar Gasto" onClick={handleSave} disabled={!canSave} />
          <div className="text-center mt-3 pb-1">
            <TextLink label="Cancelar" onClick={onCancel} />
          </div>
        </div>

        <ReceiptStamp label="Gracias por registrar tus gastos" />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: History ─────────────────────────────────────────────────────────

function HistoryScreen({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  onEdit: (id: string, data: Omit<Expense, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [filterCat, setFilterCat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Omit<Expense, 'id'> | null>(null)

  // Available months from data
  const availableMonths = useMemo(() => {
    const ms = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a))
    return ms
  }, [expenses])

  const filtered = useMemo(() => {
    return expenses
      .filter(e => !filterCat || e.category === filterCat)
      .filter(e => !filterMonth || e.date.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, filterCat, filterMonth])

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const startEdit = (e: Expense) => {
    setEditingId(e.id)
    setEditData({ description: e.description, category: e.category, amount: e.amount, date: e.date })
  }

  const saveEdit = () => {
    if (editingId && editData) {
      onEdit(editingId, editData)
      setEditingId(null)
      setEditData(null)
    }
  }

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Registro completo</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Historial</h1>
      </div>

      {/* Filters */}
      <div className="max-w-2xl mx-auto mb-4">
        <ReceiptShell maxW="max-w-2xl">
          <div className="px-5 py-3 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <div className="text-[9px] tracking-widest uppercase mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Categoría</div>
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                className="w-full bg-transparent border-b border-dashed text-xs py-0.5"
                style={{ borderColor: 'rgba(47,111,78,0.3)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
              >
                <option value="">Todas</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <div className="text-[9px] tracking-widest uppercase mb-1" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Mes</div>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full bg-transparent border-b border-dashed text-xs py-0.5"
                style={{ borderColor: 'rgba(47,111,78,0.3)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
              >
                <option value="">Todos</option>
                {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
            {(filterCat || filterMonth) && (
              <button
                onClick={() => { setFilterCat(''); setFilterMonth('') }}
                className="self-end text-[10px] underline"
                style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </ReceiptShell>
      </div>

      {/* Expense list */}
      <ReceiptShell maxW="max-w-2xl">
        <div className="px-6 pt-5 pb-4">
          <ReceiptStamp label={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`} />
          <Dots />

          {filtered.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.4)' }}>
              Sin gastos para los filtros seleccionados
            </p>
          ) : (
            filtered.map((e, i) => (
              <div key={e.id}>
                {editingId === e.id && editData ? (
                  /* Edit form */
                  <div className="py-3 space-y-2">
                    <input
                      value={editData.description}
                      onChange={ev => setEditData({ ...editData, description: ev.target.value })}
                      className="w-full bg-transparent border-b border-dashed text-xs py-0.5"
                      style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editData.category}
                        onChange={ev => setEditData({ ...editData, category: ev.target.value })}
                        className="bg-transparent border-b border-dashed text-xs py-0.5"
                        style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        type="number"
                        value={editData.amount}
                        onChange={ev => setEditData({ ...editData, amount: Number(ev.target.value) })}
                        className="bg-transparent border-b border-dashed text-xs py-0.5"
                        style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
                      />
                    </div>
                    <input
                      type="date"
                      value={editData.date}
                      onChange={ev => setEditData({ ...editData, date: ev.target.value })}
                      className="bg-transparent border-b border-dashed text-xs py-0.5"
                      style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
                    />
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEdit} className="flex-1 py-1.5 text-[10px] tracking-widest uppercase" style={{ backgroundColor: '#2f6f4e', color: '#f6f1e4', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono',monospace" }}>Guardar</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 text-[10px] tracking-widest uppercase border border-dashed" style={{ borderColor: 'rgba(47,111,78,0.3)', background: 'none', color: '#2f6f4e', cursor: 'pointer', fontFamily: "'Space Mono',monospace" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* Normal row */
                  <div className="flex justify-between items-start py-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{e.description}</div>
                      <div className="text-[9px] mt-0.5 flex gap-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
                        <span
                          className="px-1.5 py-0.5"
                          style={{ backgroundColor: CAT_COLOR[e.category] + '22', color: CAT_COLOR[e.category], border: `1px solid ${CAT_COLOR[e.category]}55` }}
                        >
                          {CAT_EMOJI[e.category]} {e.category}
                        </span>
                        <span>{fmtDate(e.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{fmt(e.amount)}</span>
                      <button
                        onClick={() => startEdit(e)}
                        className="text-[9px] px-1.5 py-0.5 border border-dashed"
                        style={{ borderColor: 'rgba(47,111,78,0.3)', color: '#2f6f4e', background: 'none', cursor: 'pointer', fontFamily: "'Space Mono',monospace" }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-[9px] px-1.5 py-0.5 border border-dashed"
                        style={{ borderColor: 'rgba(192,57,43,0.3)', color: '#c0392b', background: 'none', cursor: 'pointer', fontFamily: "'Space Mono',monospace" }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                {i < filtered.length - 1 && <div style={{ borderTop: '1px dotted rgba(47,111,78,0.2)' }} />}
              </div>
            ))
          )}

          <Dots />
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>★ TOTAL</span>
            <span className="text-xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{fmt(total)}</span>
          </div>
        </div>

        <ReceiptStamp label={`${filtered.length} gastos registrados`} />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Categories ───────────────────────────────────────────────────────

const RADIAN = Math.PI / 180
function renderCustomLabel(props: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#f6f1e4" textAnchor="middle" dominantBaseline="central" fontSize={10} fontFamily="'Space Mono',monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function CategoriesScreen({ expenses }: { expenses: Expense[] }) {
  const [view, setView] = useState<'pie' | 'bar'>('pie')
  const ym = currentMonth()
  const [selMonth, setSelMonth] = useState(ym)

  const availableMonths = useMemo(() => {
    const ms = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a))
    return ms
  }, [expenses])

  const data = useMemo(() => {
    const filtered = expenses.filter(e => e.date.startsWith(selMonth))
    const bycat: Record<string, number> = {}
    for (const e of filtered) {
      bycat[e.category] = (bycat[e.category] || 0) + e.amount
    }
    return CATEGORIES
      .filter(c => bycat[c])
      .map(c => ({ name: c, value: bycat[c], color: CAT_COLOR[c] }))
      .sort((a, b) => b.value - a.value)
  }, [expenses, selMonth])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Análisis visual</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Por Categoría</h1>
      </div>

      <ReceiptShell maxW="max-w-2xl">
        <div className="px-6 pt-5 pb-4">
          {/* Controls */}
          <div className="flex items-center justify-between mb-3">
            <select
              value={selMonth}
              onChange={e => setSelMonth(e.target.value)}
              className="bg-transparent border-b border-dashed text-xs py-0.5"
              style={{ borderColor: 'rgba(47,111,78,0.3)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
            >
              {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <div className="flex gap-1">
              {(['pie', 'bar'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-2 py-1 text-[9px] tracking-widest uppercase border border-dashed"
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    backgroundColor: view === v ? '#2f6f4e' : 'transparent',
                    color: view === v ? '#f6f1e4' : '#2f6f4e',
                    borderColor: 'rgba(47,111,78,0.3)',
                    cursor: 'pointer',
                    border: view === v ? '1px solid #2f6f4e' : '1px dashed rgba(47,111,78,0.3)',
                  }}
                >
                  {v === 'pie' ? '◎ Circular' : '▦ Barras'}
                </button>
              ))}
            </div>
          </div>

          <Dots />
          <ReceiptStamp label={`Distribución · ${monthLabel(selMonth)}`} />
          <Dots />

          {data.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.4)' }}>Sin gastos en este mes</p>
          ) : (
            <>
              {/* Chart */}
              <div className="h-56 my-4">
                {view === 'pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {data.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmt(Number(v))}
                        contentStyle={{ fontFamily: "'Space Mono',monospace", fontSize: 11, backgroundColor: '#f6f1e4', border: '1px dashed rgba(47,111,78,0.3)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,111,78,0.15)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "'Space Mono',monospace", fill: 'rgba(47,111,78,0.7)' }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 9, fontFamily: "'Space Mono',monospace", fill: 'rgba(47,111,78,0.7)' }} tickFormatter={(v) => `$${(Number(v)/1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v) => fmt(Number(v))}
                        contentStyle={{ fontFamily: "'Space Mono',monospace", fontSize: 11, backgroundColor: '#f6f1e4', border: '1px dashed rgba(47,111,78,0.3)' }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {data.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <Dots />

              {/* Category breakdown table */}
              <div className="space-y-2">
                {data.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-2 h-2 shrink-0" style={{ backgroundColor: d.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>
                          {CAT_EMOJI[d.name]} {d.name}
                        </span>
                        <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>
                          {fmt(d.value)}
                        </span>
                      </div>
                      <div className="h-1.5" style={{ backgroundColor: 'rgba(47,111,78,0.1)' }}>
                        <div className="h-full" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }} />
                      </div>
                      <div className="text-[9px] mt-0.5 text-right" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
                        {((d.value / total) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Dots />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>★ TOTAL MES</span>
                <span className="text-xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{fmt(total)}</span>
              </div>
            </>
          )}
        </div>

        <ReceiptStamp label="Análisis de Categorías" />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Set Limit ───────────────────────────────────────────────────────

function SetLimitScreen({
  current, onSave, onCancel,
}: {
  current: number; onSave: (n: number) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState(String(current))
  const numVal = Number(value)
  const suggestions = [50000, 100000, 150000, 200000, 300000]

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Configuración</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Límite Mensual</h1>
      </div>

      <ReceiptShell maxW="max-w-sm">
        <div className="px-6 pt-5 pb-4">
          <ReceiptStamp label="Control de presupuesto" />
          <Dots />

          <div className="text-center py-4">
            <div className="text-[10px] tracking-widest uppercase mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>
              Límite actual
            </div>
            <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>
              {fmt(current)}
            </div>
            <div className="text-[10px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>por mes</div>
          </div>

          <Dots />

          <div className="mb-4">
            <label className="text-[10px] tracking-widest uppercase block mb-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.7)' }}>
              Nuevo límite ($)
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.4)' }}>$</span>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                min="1000"
                step="1000"
                className="flex-1 bg-transparent border-b border-dashed py-1 text-2xl font-bold"
                style={{ borderColor: 'rgba(47,111,78,0.35)', fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}
              />
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="mb-4">
            <div className="text-[9px] tracking-widest uppercase mb-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>Sugerencias</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setValue(String(s))}
                  className="px-2 py-1 text-[9px] border border-dashed transition-all"
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    borderColor: Number(value) === s ? '#2f6f4e' : 'rgba(47,111,78,0.25)',
                    backgroundColor: Number(value) === s ? 'rgba(47,111,78,0.1)' : 'transparent',
                    color: '#2f6f4e',
                    cursor: 'pointer',
                  }}
                >
                  {fmt(s)}
                </button>
              ))}
            </div>
          </div>

          <Dots />

          <div className="flex justify-between text-[10px] py-2" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
            <span>NUEVO LÍMITE</span>
            <span className="font-bold" style={{ color: '#1a3a28' }}>{numVal > 0 ? fmt(numVal) : '—'}</span>
          </div>

          <Dots />

          <div className="pt-1">
            <GreenBtn label="✦ Guardar Límite" onClick={() => onSave(numVal)} disabled={numVal < 1000} />
            <div className="text-center mt-3">
              <TextLink label="Cancelar" onClick={onCancel} />
            </div>
          </div>
        </div>

        <ReceiptStamp label="Configura tu presupuesto" />
        <div className="h-3" />
      </ReceiptShell>
    </div>
  )
}

// ─── SCREEN: Profile ─────────────────────────────────────────────────────────

function ProfileScreen({
  user, expenses, monthlyLimit, onLogout, onNav,
}: {
  user: User; expenses: Expense[]; monthlyLimit: number;
  onLogout: () => void; onNav: (s: Screen) => void;
}) {
  const ym = currentMonth()
  const thisMonth = expenses.filter(e => e.date.startsWith(ym))
  const total = thisMonth.reduce((s, e) => s + e.amount, 0)
  const allTime = expenses.reduce((s, e) => s + e.amount, 0)
  const avgMonth = expenses.length > 0 ? allTime / Math.max(1, [...new Set(expenses.map(e => e.date.slice(0, 7)))].length) : 0

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.55)' }}>Cuenta personal</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>Mi Perfil</h1>
      </div>

      <div className="max-w-sm mx-auto space-y-4">
        {/* Avatar & user card */}
        <ReceiptShell maxW="max-w-sm">
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 flex items-center justify-center text-xl font-bold shrink-0 border-2 border-dashed"
                style={{
                  fontFamily: "'Fraunces',serif",
                  backgroundColor: 'rgba(47,111,78,0.1)',
                  borderColor: 'rgba(47,111,78,0.3)',
                  color: '#2f6f4e',
                }}
              >
                {initials}
              </div>
              <div>
                <div className="text-lg font-bold leading-tight" style={{ fontFamily: "'Fraunces',serif", color: '#1a3a28' }}>{user.name}</div>
                <div className="text-[10px] mt-0.5" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>{user.email}</div>
                <div
                  className="text-[9px] mt-1 px-2 py-0.5 inline-block border border-dashed"
                  style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e', borderColor: 'rgba(47,111,78,0.3)' }}
                >
                  ESTUDIANTE ✦
                </div>
              </div>
            </div>

            <Dots />

            {/* Stats */}
            <div className="text-[10px] tracking-widest uppercase mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              Resumen de actividad
            </div>
            <div className="space-y-2">
              {[
                { label: 'Total de gastos registrados', value: String(expenses.length) },
                { label: 'Gasto total histórico', value: fmt(allTime) },
                { label: 'Promedio mensual', value: fmt(Math.round(avgMonth)) },
                { label: 'Gasto este mes', value: fmt(total) },
                { label: 'Límite mensual actual', value: fmt(monthlyLimit) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1" style={{ borderBottom: '1px dotted rgba(47,111,78,0.15)' }}>
                  <span className="text-[10px]" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>{label}</span>
                  <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono',monospace", color: '#1a3a28' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <ReceiptStamp label="Datos del usuario" />
          <div className="h-3" />
        </ReceiptShell>

        {/* Actions */}
        <ReceiptShell maxW="max-w-sm">
          <div className="px-6 py-4 space-y-2">
            <div className="text-[10px] tracking-widest uppercase mb-3" style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.5)' }}>
              Opciones
            </div>
            {[
              { label: 'Configurar límite mensual', screen: 'setLimit' as Screen },
              { label: 'Ver resumen por categoría', screen: 'categories' as Screen },
              { label: 'Ver historial completo', screen: 'history' as Screen },
            ].map(({ label, screen }) => (
              <button
                key={screen}
                onClick={() => onNav(screen)}
                className="w-full text-left py-2.5 px-3 text-xs border border-dashed flex justify-between items-center transition-all hover:bg-[rgba(47,111,78,0.06)]"
                style={{ fontFamily: "'Space Mono',monospace", color: '#2f6f4e', borderColor: 'rgba(47,111,78,0.25)', background: 'none', cursor: 'pointer' }}
              >
                {label} <span>→</span>
              </button>
            ))}

            <Dots />

            <button
              onClick={onLogout}
              className="w-full py-3 text-xs tracking-widest uppercase border border-dashed transition-all"
              style={{
                fontFamily: "'Space Mono',monospace",
                color: '#c0392b',
                borderColor: 'rgba(192,57,43,0.3)',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              ⟵ Cerrar Sesión
            </button>
          </div>

          <ReceiptStamp label="Mis Gastos · v1.0" />
          <div className="h-3" />
        </ReceiptShell>
      </div>
    </div>
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: `translateX(-50%) translateY(${visible ? 0 : -12}px)`, pointerEvents: 'none' }}
    >
      <div
        className="px-4 py-2 text-xs tracking-widest uppercase"
        style={{ backgroundColor: '#2f6f4e', color: '#f6f1e4', fontFamily: "'Space Mono',monospace" }}
      >
        ✦ {message}
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User>({ name: '', email: '' })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyLimit, setMonthlyLimit] = useState(120000)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const isLoggedIn = !!userId

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200)
  }

  const navigate = (s: Screen) => setScreen(s)

  // Carga los gastos y el perfil (límite mensual) del usuario que inició sesión
  const loadUserData = async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    setUserId(authUser.id)
    setUser({ name: authUser.user_metadata?.name || authUser.email || 'Usuario', email: authUser.email || '' })

    const [{ data: perfil }, { data: gastos }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('user_id', authUser.id).single(),
      supabase.from('gastos').select('*').eq('user_id', authUser.id).order('date', { ascending: false }),
    ])

    if (perfil) setMonthlyLimit(Number(perfil.limite_mensual))
    if (gastos) {
      setExpenses(gastos.map((g: any) => ({
        id: g.id, description: g.description, category: g.category,
        amount: Number(g.amount), date: g.date,
      })))
    }

    setScreen(s => (s === 'login' || s === 'register') ? 'dashboard' : s)
  }

  // Al cargar la app, revisa si ya hay una sesión activa y se mantiene atenta a cambios
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserData(session.user)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user)
      } else {
        setUserId(null)
        setUser({ name: '', email: '' })
        setExpenses([])
        setScreen('login')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const traducirError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos'
    if (msg.includes('already registered')) return 'Ese correo ya tiene una cuenta'
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres'
    return 'Ocurrió un error. Intenta de nuevo.'
  }

  const handleLogin = async (email: string, pass: string) => {
    setAuthError('')
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setAuthLoading(false)
    if (error) setAuthError(traducirError(error.message))
  }

  const handleRegister = async (name: string, email: string, pass: string) => {
    setAuthError('')
    setAuthLoading(true)
    const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name } } })
    setAuthLoading(false)
    if (error) { setAuthError(traducirError(error.message)); return }
    showToast('Cuenta creada exitosamente')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleAddExpense = async (data: Omit<Expense, 'id'>) => {
    const { data: row, error } = await supabase.from('gastos').insert(data).select().single()
    if (error || !row) { showToast('No se pudo guardar el gasto'); return }
    setExpenses(prev => [{
      id: row.id, description: row.description, category: row.category,
      amount: Number(row.amount), date: row.date,
    }, ...prev])
    setScreen('dashboard')
    showToast('Gasto guardado')
  }

  const handleEditExpense = async (id: string, data: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('gastos').update(data).eq('id', id)
    if (error) { showToast('No se pudo actualizar el gasto'); return }
    setExpenses(prev => prev.map(e => e.id === id ? { id, ...data } : e))
    showToast('Gasto actualizado')
  }

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) { showToast('No se pudo eliminar el gasto'); return }
    setExpenses(prev => prev.filter(e => e.id !== id))
    showToast('Gasto eliminado')
  }

  const handleSaveLimit = async (n: number) => {
    if (!userId) return
    const { error } = await supabase.from('perfiles').update({ limite_mensual: n }).eq('user_id', userId)
    if (error) { showToast('No se pudo actualizar el límite'); return }
    setMonthlyLimit(n)
    setScreen('dashboard')
    showToast('Límite actualizado')
  }

  const showNav = isLoggedIn && !['login', 'register'].includes(screen)

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8e2d5' }}>
        <p style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(47,111,78,0.6)' }}>Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e8e2d5' }}>
      <Toast message={toast.message} visible={toast.visible} />

      {/* Sidebar (desktop) */}
      {showNav && (
        <Sidebar current={screen} onNav={navigate} user={user} />
      )}

      {/* Main content area */}
      <main
        className={showNav ? 'md:ml-56' : ''}
        style={{ paddingBottom: showNav ? '72px' : 0 }}
      >
        {screen === 'login' && (
          <LoginScreen onLogin={handleLogin} onGoRegister={() => { setAuthError(''); navigate('register') }} error={authError} loading={authLoading} />
        )}
        {screen === 'register' && (
          <RegisterScreen onRegister={handleRegister} onGoLogin={() => { setAuthError(''); navigate('login') }} error={authError} loading={authLoading} />
        )}
        {screen === 'dashboard' && (
          <DashboardScreen expenses={expenses} monthlyLimit={monthlyLimit} user={user} onNav={navigate} />
        )}
        {screen === 'addExpense' && (
          <AddExpenseScreen onSave={handleAddExpense} onCancel={() => navigate('dashboard')} />
        )}
        {screen === 'history' && (
          <HistoryScreen expenses={expenses} onEdit={handleEditExpense} onDelete={handleDeleteExpense} />
        )}
        {screen === 'categories' && (
          <CategoriesScreen expenses={expenses} />
        )}
        {screen === 'setLimit' && (
          <SetLimitScreen current={monthlyLimit} onSave={handleSaveLimit} onCancel={() => navigate('dashboard')} />
        )}
        {screen === 'profile' && (
          <ProfileScreen user={user} expenses={expenses} monthlyLimit={monthlyLimit} onLogout={handleLogout} onNav={navigate} />
        )}
      </main>

      {/* Bottom nav (mobile) */}
      {showNav && (
        <BottomNav current={screen} onNav={navigate} />
      )}
    </div>
  )
}
