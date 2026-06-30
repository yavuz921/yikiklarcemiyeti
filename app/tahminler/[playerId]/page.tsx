'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Match, Prediction, Player } from '@/lib/types'
import MatchCard, { FlagImg } from '@/components/MatchCard'
import Link from 'next/link'

const CH = 72
const CW = 180
const CGAP = 8

export default function PlayerBracketPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [matches, setMatches] = useState<Match[]>([])
  const [preds, setPreds] = useState<Record<number, string>>({})
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) return
    Promise.all([
      supabase.from('matches').select('*').order('id'),
      supabase.from('predictions').select('*').eq('player_id', playerId),
      supabase.from('players').select('*').eq('id', playerId).single(),
    ]).then(([m, p, pl]) => {
      if (m.data) setMatches(m.data)
      if (p.data) {
        const map: Record<number, string> = {}
        p.data.forEach((x: Prediction) => { map[x.match_id] = x.predicted_winner })
        setPreds(map)
      }
      if (pl.data) setPlayer(pl.data)
      setLoading(false)
    })
  }, [playerId])

  const resolve = useCallback((mid: number | null): string | null => {
    if (!mid) return null
    const m = matches.find(x => x.id === mid)
    if (!m) return null
    return m.winner || preds[m.id] || null
  }, [matches, preds])

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
              predA={preds[id] === tA}
              predB={preds[id] === tB}
              teamA={tA} teamB={tB}
              onSelect={() => {}} locked={true} />
          )
        })}
      </div>
    )
    const connector = showConnector ? (
      <div style={{ marginTop: topOffset }}>
        <Connectors count={ids.length} gap={gap} side={side} />
      </div>
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

  const finalMatch = matches.find(x => x.id === 31)
  const finalistA = resolve(29)
  const finalistB = resolve(30)
  const champion = finalMatch?.winner

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a6090' }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(6,13,31,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #0f2040',
        padding: '10px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/tahminler" style={{ color: '#4a6090', textDecoration: 'none', fontSize: 13, marginRight: 4 }}>← Geri</Link>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628', border: '2px solid #1e3060', flexShrink: 0 }}>
            {player?.avatar_url
              ? <img src={player.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22 }}>{player?.emoji || '⚽'}</span>
            }
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#dde8ff', fontSize: 15 }}>{player?.nickname}</div>
            <div style={{ fontSize: 11, color: '#4a6090' }}>tahminleri (salt okunur)</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/leaderboard" style={{ fontSize: 12, color: '#4a6090', textDecoration: 'none' }}>🏅 Liderler</Link>
          <Link href="/bracket" style={{ fontSize: 12, color: '#4a6090', textDecoration: 'none' }}>⚽ Bracket</Link>
        </div>
      </div>

      {/* Bracket */}
      <div style={{ overflowX: 'auto', padding: '20px 40px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
          <Col ids={[1,2,3,4,5,6,7,8]} label="ROUND OF 32" side="left" gap={CGAP} />
          <Col ids={[17,18,19,20]} label="ROUND OF 16" side="left" gap={CH+CGAP*2} topOffset={(CH+CGAP)/2} />
          <Col ids={[25,26]} label="QUARTER FINALS" side="left" gap={(CH+CGAP)*4-CH} topOffset={(CH+CGAP)*1.5} />
          <Col ids={[29]} label="SEMI FINALS" side="left" showConnector={false} topOffset={(CH+CGAP)*3.5} />

          {/* Final ortası */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 260, paddingTop: (CH+CGAP)*3.5 }}>
            <div style={{
              background: 'linear-gradient(160deg, #0a1428 0%, #0f1e3a 50%, #0a1428 100%)',
              border: '1px solid #1a3060', borderRadius: 16, padding: '18px 24px',
              textAlign: 'center', width: '100%', boxSizing: 'border-box',
              boxShadow: '0 0 40px rgba(74,127,203,0.15)',
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#4a7fcb', fontWeight: 700, letterSpacing: 3 }}>FIFA</div>
                <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg, #f0b429, #fff, #f0b429)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -2 }}>26</div>
                <div style={{ fontSize: 9, color: '#4a6090', fontWeight: 700, letterSpacing: 4, marginTop: -4 }}>WORLD CUP</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '14px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  {finalistA ? <><FlagImg country={finalistA} size={32} /><div style={{ fontSize: 10, color: '#8a9bbf', marginTop: 4, fontWeight: 600 }}>{finalistA}</div></> : <div style={{ width: 44, height: 30, background: '#1a2844', borderRadius: 4, opacity: 0.4 }} />}
                </div>
                <div style={{ fontSize: 18, color: '#2a3a5c', fontWeight: 900 }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  {finalistB ? <><FlagImg country={finalistB} size={32} /><div style={{ fontSize: 10, color: '#8a9bbf', marginTop: 4, fontWeight: 600 }}>{finalistB}</div></> : <div style={{ width: 44, height: 30, background: '#1a2844', borderRadius: 4, opacity: 0.4 }} />}
                </div>
              </div>
              {finalMatch && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <MatchCard match={finalMatch} predA={preds[31] === finalistA} predB={preds[31] === finalistB} teamA={finalistA} teamB={finalistB} onSelect={() => {}} locked={true} />
                </div>
              )}
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
                  <div style={{ fontSize: 9, color: '#4a6090', letterSpacing: 2, fontWeight: 700 }}>ŞAMPİYON TAHMİNİ</div>
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

          <Col ids={[30]} label="SEMI FINALS" side="right" showConnector={false} topOffset={(CH+CGAP)*3.5} />
          <Col ids={[27,28]} label="QUARTER FINALS" side="right" gap={(CH+CGAP)*4-CH} topOffset={(CH+CGAP)*1.5} />
          <Col ids={[21,22,23,24]} label="ROUND OF 16" side="right" gap={CH+CGAP*2} topOffset={(CH+CGAP)/2} />
          <Col ids={[9,10,11,12,13,14,15,16]} label="ROUND OF 32" side="right" gap={CGAP} />
        </div>
      </div>
    </div>
  )
}
