'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Match, Prediction } from '@/lib/types'
import MatchCard, { FlagImg } from '@/components/MatchCard'

const POINTS: Record<string, number> = { r32: 1, r16: 2, qf: 4, sf: 8, final: 16 }
const CH = 72     // kart yüksekliği
const CW = 180    // kart genişliği
const CGAP = 8    // r32 gap

export default function BracketPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [preds, setPreds] = useState<Record<number, string>>({})
  const [locked, setLocked] = useState(false)
  const [tLocked, setTLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [pid, setPid] = useState<string | null>(null)
  const [nick, setNick] = useState('')
  const [emo, setEmo] = useState('⚽')
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('wc_player_id')
    if (!id) { router.push('/'); return }
    setPid(id)
    setNick(localStorage.getItem('wc_nickname') || '')
    setEmo(localStorage.getItem('wc_emoji') || '⚽')
    setAvatar(localStorage.getItem('wc_avatar'))
    load(id)
  }, [router])

  async function load(id: string) {
    const [m, p, pl, s] = await Promise.all([
      supabase.from('matches').select('*').order('id'),
      supabase.from('predictions').select('*').eq('player_id', id),
      supabase.from('players').select('is_locked').eq('id', id).single(),
      supabase.from('app_settings').select('tournament_locked').eq('id', 1).single(),
    ])
    if (m.data) setMatches(m.data)
    if (p.data) {
      const map: Record<number, string> = {}
      p.data.forEach((x: Prediction) => { map[x.match_id] = x.predicted_winner })
      setPreds(map)
    }
    if (pl.data) setLocked(pl.data.is_locked)
    if (s.data) setTLocked(s.data.tournament_locked)
  }

  const resolve = useCallback((mid: number | null): string | null => {
    if (!mid) return null
    const m = matches.find(x => x.id === mid)
    if (!m) return null
    return m.winner || preds[m.id] || null
  }, [matches, preds])

  function clearDown(cid: number, p: Record<number, string>) {
    matches.filter(m => m.left_from_match === cid || m.right_from_match === cid).forEach(dep => {
      delete p[dep.id]; clearDown(dep.id, p)
    })
  }

  async function pick(mid: number, winner: string) {
    if (locked || tLocked) return
    const np = { ...preds, [mid]: winner }
    if (preds[mid] && preds[mid] !== winner) clearDown(mid, np)
    setPreds(np)
    await supabase.from('predictions').upsert(
      { player_id: pid, match_id: mid, predicted_winner: winner },
      { onConflict: 'player_id,match_id' }
    )
  }

  async function lockIn() {
    if (!pid || !confirm('Tahminlerini kilitleyeceksin. Onaylıyor musun?')) return
    setSaving(true)
    await supabase.from('players').update({ is_locked: true }).eq('id', pid)
    setLocked(true); setDone(true); setSaving(false)
  }

  const isLocked = locked || tLocked

  /* ── Connector SVG ── */
  function Connectors({ count, gap, side }: { count: number; gap: number; side: 'left' | 'right' }) {
    const pairs = Math.floor(count / 2)
    const H = count * CH + (count - 1) * gap
    const W = 32
    return (
      <svg width={W} height={H} style={{ flexShrink: 0 }} overflow="visible">
        {Array.from({ length: pairs }).map((_, i) => {
          const yA = i * 2 * (CH + gap) + CH / 2
          const yB = (i * 2 + 1) * (CH + gap) + CH / 2
          const yMid = (yA + yB) / 2
          const x1 = side === 'left' ? 0 : W
          const x2 = side === 'left' ? W : 0
          return (
            <g key={i}>
              <line x1={x1} y1={yA} x2={x2} y2={yA} stroke="#1e3060" strokeWidth={1.5} />
              <line x1={x2} y1={yA} x2={x2} y2={yB} stroke="#1e3060" strokeWidth={1.5} />
              <line x1={x2} y1={yB} x2={x1} y2={yB} stroke="#1e3060" strokeWidth={1.5} />
              <line x1={x2} y1={yMid} x2={x2 + (side === 'left' ? 4 : -4)} y2={yMid} stroke="#3a6cc0" strokeWidth={2} />
            </g>
          )
        })}
      </svg>
    )
  }

  /* ── Tek sütun ── */
  function Col({ ids, label, side = 'left', topOffset = 0, gap = CGAP, showConnector = true }:
    { ids: number[]; label: string; side?: 'left' | 'right'; topOffset?: number; gap?: number; showConnector?: boolean }) {

    const cards = (
      <div style={{ display: 'flex', flexDirection: 'column', gap, marginTop: topOffset }}>
        {ids.map(id => {
          const m = matches.find(x => x.id === id)
          if (!m) return <div key={id} style={{ width: CW, height: CH }} />
          const tA = m.left_from_match ? resolve(m.left_from_match) : m.team_a
          const tB = m.right_from_match ? resolve(m.right_from_match) : m.team_b
          return (
            <MatchCard key={id} match={m}
              predA={preds[id] === tA} predB={preds[id] === tB}
              teamA={tA} teamB={tB}
              onSelect={pick} locked={isLocked} />
          )
        })}
      </div>
    )

    const connector = showConnector ? (
      <Connectors count={ids.length} gap={gap} side={side} />
    ) : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4a7fcb', letterSpacing: 2, marginBottom: 10, whiteSpace: 'nowrap' }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {side === 'left' ? <>{cards}{connector}</> : <>{connector}{cards}</>}
        </div>
      </div>
    )
  }

  /* ── Final ortası ── */
  const finalMatch = matches.find(x => x.id === 31)
  const finalistA = resolve(29)
  const finalistB = resolve(30)
  const champion = finalMatch?.winner

  const total = Object.keys(preds).length

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f' }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(6,13,31,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #0f2040',
        padding: '10px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628', border: '2px solid #1e3060', flexShrink: 0 }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22 }}>{emo}</span>
            }
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#dde8ff', fontSize: 15 }}>{nick}</div>
            <div style={{ fontSize: 11, color: '#4a6090' }}>
              {total}/{matches.length} tahmin yapıldı
              {total > 0 && (
                <span style={{ color: '#f0b429', marginLeft: 8 }}>
                  · {Object.entries(POINTS).reduce((s, [r, p]) =>
                    s + matches.filter(m => m.round === r && !m.winner && preds[m.id]).length * p, 0)
                  } potansiyel puan
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/leaderboard" style={{ fontSize: 12, color: '#4a6090', textDecoration: 'none' }}>🏅 Liderler</a>
          <a href="/tahminler" style={{ fontSize: 12, color: '#4a6090', textDecoration: 'none' }}>📊 Tahminler</a>
          {!isLocked ? (
            <button onClick={lockIn} disabled={saving} style={{
              background: saving ? '#1a2a48' : '#f0b429',
              color: saving ? '#4a6090' : '#060d1f',
              fontWeight: 800, fontSize: 13, padding: '7px 20px',
              borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Kilitleniyor...' : '🔒 Kilitle & Gönder'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)',
              color: '#2ecc71', fontSize: 12, padding: '7px 16px', borderRadius: 8
            }}>
              🔒 {locked ? 'Kilitlendi' : 'Turnuva başladı'}
            </div>
          )}
        </div>
      </div>

      {done && (
        <div style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
          background: '#f0b429', color: '#060d1f', padding: '9px 28px',
          borderRadius: 999, fontWeight: 800, fontSize: 13, zIndex: 99
        }}>
          ✅ Tahminlerin kaydedildi ve kilitlendi!
        </div>
      )}

      {/* ── PUAN SISTEMI ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 0', flexWrap: 'wrap' }}>
        {Object.entries(POINTS).map(([r, p]) => (
          <span key={r} style={{
            background: '#0c1835', border: '1px solid #0f2040',
            borderRadius: 999, padding: '3px 12px', fontSize: 11, color: '#4a6090'
          }}>
            {r === 'r32' ? 'R32' : r === 'r16' ? 'R16' : r === 'qf' ? 'QF' : r === 'sf' ? 'SF' : 'Final'}
            {': '}<b style={{ color: '#f0b429' }}>{p}p</b>
          </span>
        ))}
      </div>

      {/* ── BRACKET ── */}
      <div style={{ overflowX: 'auto', padding: '20px 40px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>

          {/* SOL R32 */}
          <Col ids={[1, 2, 3, 4, 5, 6, 7, 8]} label="ROUND OF 32" side="left" gap={CGAP} />

          {/* SOL R16 */}
          <Col ids={[17, 18, 19, 20]} label="ROUND OF 16" side="left"
            gap={CH + CGAP * 3}
            topOffset={(CH + CGAP) / 2} />

          {/* SOL QF */}
          <Col ids={[25, 26]} label="QUARTER FINALS" side="left"
            gap={(CH + CGAP) * 4 + CH}
            topOffset={(CH + CGAP) * 1.5 + CGAP} />

          {/* SOL SF */}
          <Col ids={[29]} label="SEMI FINALS" side="left" showConnector={false}
            topOffset={(CH + CGAP) * 3.5 + CGAP * 2} />

          {/* ── FİNAL ORTASI ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flexShrink: 0, width: 260,
            paddingTop: (CH + CGAP) * 3.5 + CGAP * 2,
          }}>
            {/* FIFA WC 2026 Logo alanı */}
            <div style={{
              background: 'linear-gradient(160deg, #0a1428 0%, #0f1e3a 50%, #0a1428 100%)',
              border: '1px solid #1a3060',
              borderRadius: 16, padding: '18px 24px',
              textAlign: 'center', width: '100%', boxSizing: 'border-box',
              boxShadow: '0 0 40px rgba(74,127,203,0.15)',
            }}>
              {/* Logo */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#4a7fcb', fontWeight: 700, letterSpacing: 3 }}>FIFA</div>
                <div style={{
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  background: 'linear-gradient(135deg, #f0b429, #fff, #f0b429)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: -2,
                }}>26</div>
                <div style={{ fontSize: 9, color: '#4a6090', fontWeight: 700, letterSpacing: 4, marginTop: -4 }}>WORLD CUP</div>
              </div>

              {/* Finalist bayrakları */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '14px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  {finalistA ? (
                    <>
                      <FlagImg country={finalistA} size={32} />
                      <div style={{ fontSize: 10, color: '#8a9bbf', marginTop: 4, fontWeight: 600 }}>{finalistA}</div>
                    </>
                  ) : (
                    <div style={{ width: 44, height: 30, background: '#1a2844', borderRadius: 4, opacity: 0.4 }} />
                  )}
                </div>
                <div style={{ fontSize: 18, color: '#2a3a5c', fontWeight: 900 }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  {finalistB ? (
                    <>
                      <FlagImg country={finalistB} size={32} />
                      <div style={{ fontSize: 10, color: '#8a9bbf', marginTop: 4, fontWeight: 600 }}>{finalistB}</div>
                    </>
                  ) : (
                    <div style={{ width: 44, height: 30, background: '#1a2844', borderRadius: 4, opacity: 0.4 }} />
                  )}
                </div>
              </div>

              {/* Final maç kartı */}
              {finalMatch && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <MatchCard
                    match={finalMatch}
                    predA={preds[31] === finalistA}
                    predB={preds[31] === finalistB}
                    teamA={finalistA}
                    teamB={finalistB}
                    onSelect={pick}
                    locked={isLocked}
                  />
                </div>
              )}

              {/* Şampiyon veya tahmin */}
              {champion ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: '#4a6090', letterSpacing: 2, fontWeight: 700 }}>ŞAMPİYON</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <FlagImg country={champion} size={22} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f0b429' }}>{champion}</span>
                  </div>
                </div>
              ) : preds[31] ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: '#4a6090', letterSpacing: 2, fontWeight: 700 }}>ŞAMPİYON TAHMİNİN</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <FlagImg country={preds[31]} size={22} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#7ab8ff' }}>{preds[31]}</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: '#2a3a5c', marginTop: 8, letterSpacing: 2 }}>CHAMPION</div>
              )}
            </div>
          </div>

          {/* SAĞ SF */}
          <Col ids={[30]} label="SEMI FINALS" side="right" showConnector={false}
            topOffset={(CH + CGAP) * 3.5 + CGAP * 2} />

          {/* SAĞ QF */}
          <Col ids={[27, 28]} label="QUARTER FINALS" side="right"
            gap={(CH + CGAP) * 4 + CH}
            topOffset={(CH + CGAP) * 1.5 + CGAP} />

          {/* SAĞ R16 */}
          <Col ids={[21, 22, 23, 24]} label="ROUND OF 16" side="right"
            gap={CH + CGAP * 3}
            topOffset={(CH + CGAP) / 2} />

          {/* SAĞ R32 */}
          <Col ids={[9, 10, 11, 12, 13, 14, 15, 16]} label="ROUND OF 32" side="right" gap={CGAP} />

        </div>
      </div>
    </div>
  )
}
