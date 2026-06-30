'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Match } from '@/lib/types'

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Çeyrek Final', sf: 'Yarı Final', final: 'Final'
}

async function adminPost(action: string, extra?: Record<string, unknown>) {
  const res = await fetch('/api/admin-action?key=yikilarcemiyeti2026', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra })
  })
  return res.json()
}

function resolveTeam(matchId: number | null, matches: Match[]): string | null {
  if (!matchId) return null
  const m = matches.find(x => x.id === matchId)
  if (!m) return null
  return m.winner || null
}

function getTeams(match: Match, matches: Match[]): { tA: string | null, tB: string | null } {
  const tA = match.left_from_match ? resolveTeam(match.left_from_match, matches) : match.team_a
  const tB = match.right_from_match ? resolveTeam(match.right_from_match, matches) : match.team_b
  return { tA: tA || null, tB: tB || null }
}

function AdminContent() {
  const params = useSearchParams()
  const key = params.get('key')
  const [authed, setAuthed] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [tournamentLocked, setTournamentLocked] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [recalcing, setRecalcing] = useState(false)
  const [pending, setPending] = useState<Record<number, string>>({})

  useEffect(() => {
    if (key === 'yikilarcemiyeti2026') {
      setAuthed(true)
      loadData()
    }
  }, [key])

  async function loadData() {
    const [{ data: mts }, { data: settings }] = await Promise.all([
      supabase.from('matches').select('*').order('id'),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
    ])
    if (mts) setMatches(mts)
    if (settings) setTournamentLocked(settings.tournament_locked)
  }

  async function toggleTournamentLock() {
    const newVal = !tournamentLocked
    const data = await adminPost('toggle_lock', { locked: newVal })
    if (data.error) { setMessage(`❌ ${data.error}`); return }
    setTournamentLocked(newVal)
    setMessage(newVal ? '🔒 Turnuva kilitlendi!' : '🔓 Turnuva kilidi açıldı.')
  }

  async function confirmWinner(matchId: number) {
    const winner = pending[matchId]
    if (!winner) return
    setSaving(matchId)
    setMessage('⏳ Kaydediliyor...')
    const data = await adminPost('set_winner', { matchId, winner })
    if (data.error) {
      setMessage(`❌ Hata: ${data.error}`)
      setSaving(null)
      return
    }
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, winner } : m))
    setPending(prev => { const n = { ...prev }; delete n[matchId]; return n })
    setSaving(null)
    setMessage(`✅ ${winner} kazandı — puanlar güncellendi!`)
  }

  async function manualRecalculate() {
    setRecalcing(true)
    setMessage('⏳ Puanlar hesaplanıyor...')
    const data = await adminPost('recalculate')
    setRecalcing(false)
    setMessage(data.error ? `❌ ${data.error}` : '✅ Puanlar güncellendi!')
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
          <div style={{ color: '#e8edf5', fontSize: 20, fontWeight: 700 }}>Yetkisiz Erişim</div>
          <div style={{ color: '#4a6090', marginTop: 8 }}>URL'ye ?key=yikilarcemiyeti2026 eklemen gerekiyor</div>
        </div>
      </div>
    )
  }

  const rounds = ['r32', 'r16', 'qf', 'sf', 'final']

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36 }}>⚙️</div>
          <h1 style={{ color: '#e8edf5', fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>Admin Paneli</h1>
          <div style={{ color: '#4a6090', fontSize: 13 }}>Yıkıklar Cemiyeti 2026</div>
        </div>

        {message && (
          <div style={{
            background: message.startsWith('❌') ? 'rgba(231,76,60,0.1)' : message.startsWith('⏳') ? 'rgba(74,127,203,0.1)' : 'rgba(46,213,115,0.1)',
            border: `1px solid ${message.startsWith('❌') ? 'rgba(231,76,60,0.3)' : message.startsWith('⏳') ? 'rgba(74,127,203,0.3)' : 'rgba(46,213,115,0.3)'}`,
            color: message.startsWith('❌') ? '#e74c3c' : message.startsWith('⏳') ? '#4a7fcb' : '#2ed573',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Turnuva kilidi */}
        <div style={{ background: '#0a1628', border: '1px solid #1a2a4a', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <h2 style={{ color: '#e8edf5', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>🔒 Turnuva Kilidi</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ color: tournamentLocked ? '#f0b429' : '#2ed573', fontWeight: 700 }}>
                {tournamentLocked ? '🔒 Kilitli — tahminler donduruldu' : '🔓 Açık — tahminler alınıyor'}
              </div>
              <div style={{ color: '#4a6090', fontSize: 13, marginTop: 4 }}>
                {tournamentLocked ? 'Kimse artık tahminini değiştiremez.' : 'Kilitlediğinde herkesin tahmini dondurulur.'}
              </div>
            </div>
            <button
              onClick={toggleTournamentLock}
              style={{
                background: tournamentLocked ? '#7f1d1d' : '#14532d',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {tournamentLocked ? '🔓 Kilidi Aç' : '🔒 Kilitle'}
            </button>
          </div>
        </div>

        {/* Maç sonuçları */}
        <div style={{ background: '#0a1628', border: '1px solid #1a2a4a', borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: '#e8edf5', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>⚽ Maç Sonuçları</h2>
          <p style={{ color: '#4a6090', fontSize: 13, margin: '0 0 24px' }}>
            Bir takıma tıkla → seç → Onayla butonuna bas. Puanlar otomatik güncellenir.
          </p>

          {rounds.map(round => {
            const roundMatches = matches.filter(m => m.round === round)
            if (roundMatches.length === 0) return null
            return (
              <div key={round} style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: '#4a7fcb', letterSpacing: 2,
                  marginBottom: 12, borderBottom: '1px solid #1a2a4a', paddingBottom: 8
                }}>
                  {ROUND_LABELS[round].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {roundMatches.map(match => {
                    const hasPending = pending[match.id] !== undefined
                    const selected = pending[match.id]
                    const confirmed = match.winner
                    const { tA, tB } = getTeams(match, matches)

                    return (
                      <div key={match.id} style={{
                        background: '#060d1f',
                        border: `1px solid ${hasPending ? '#4a7fcb' : confirmed ? '#1a4a2a' : (!tA || !tB) ? '#0f1a2a' : '#1a2a4a'}`,
                        borderRadius: 12, padding: '14px 16px',
                        opacity: (!tA || !tB) && !confirmed ? 0.5 : 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{ color: '#4a6090', fontSize: 11 }}>#{match.id}</span>
                          <span style={{ color: '#8a9bbf', fontSize: 13 }}>
                            {tA || '?'} <span style={{ color: '#2a3a5c' }}>vs</span> {tB || '?'}
                          </span>
                          {confirmed && !hasPending && (
                            <span style={{ color: '#2ed573', fontSize: 12, fontWeight: 700, marginLeft: 4 }}>✓ {confirmed}</span>
                          )}
                          {hasPending && (
                            <span style={{ color: '#f0b429', fontSize: 12, fontWeight: 700, marginLeft: 4 }}>→ {selected} seçili</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {[tA, tB].filter(Boolean).map(team => {
                            const isSelected = selected === team
                            const isConfirmed = confirmed === team && !hasPending
                            return (
                              <button
                                key={team}
                                onClick={() => setPending(prev => ({ ...prev, [match.id]: team! }))}
                                style={{
                                  padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                  cursor: 'pointer', border: '2px solid',
                                  borderColor: isSelected ? '#f0b429' : isConfirmed ? '#2ed573' : '#1a2a4a',
                                  background: isSelected ? 'rgba(240,180,41,0.15)' : isConfirmed ? 'rgba(46,213,115,0.1)' : '#0a1628',
                                  color: isSelected ? '#f0b429' : isConfirmed ? '#2ed573' : '#8a9bbf',
                                }}
                              >
                                {team}
                              </button>
                            )
                          })}

                          {hasPending && (
                            <button
                              onClick={() => confirmWinner(match.id)}
                              disabled={saving === match.id}
                              style={{
                                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                                cursor: saving === match.id ? 'not-allowed' : 'pointer',
                                background: saving === match.id ? '#1a2a4a' : '#16a34a',
                                color: 'white', border: 'none'
                              }}
                            >
                              {saving === match.id ? '⏳' : '✅ Onayla'}
                            </button>
                          )}

                          {hasPending && (
                            <button
                              onClick={() => setPending(prev => { const n = { ...prev }; delete n[match.id]; return n })}
                              style={{
                                padding: '7px 12px', borderRadius: 8, fontSize: 12,
                                cursor: 'pointer', background: 'transparent',
                                color: '#4a6090', border: '1px solid #1a2a4a'
                              }}
                            >
                              İptal
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <button
            onClick={manualRecalculate}
            disabled={recalcing}
            style={{
              marginTop: 8, width: '100%',
              background: recalcing ? '#1a2a4a' : '#1d4ed8',
              color: recalcing ? '#4a6090' : 'white',
              border: 'none', borderRadius: 10, padding: '13px',
              fontWeight: 700, fontSize: 14, cursor: recalcing ? 'not-allowed' : 'pointer'
            }}
          >
            {recalcing ? '⏳ Hesaplanıyor...' : '🔄 Puanları Manuel Yenile'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  )
}
