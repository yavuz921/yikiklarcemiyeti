'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Match, Player, Prediction } from '@/lib/types'
import Link from 'next/link'

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Çeyrek Final', sf: 'Yarı Final', final: 'Final'
}
const ROUNDS = ['r32', 'r16', 'qf', 'sf', 'final']

export default function TahminlerPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Player | null>(null)
  const [selectedRound, setSelectedRound] = useState('r32')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: pls }, { data: mts }, { data: preds }] = await Promise.all([
      supabase.from('players').select('*').eq('is_locked', true).order('created_at'),
      supabase.from('matches').select('*').order('id'),
      supabase.from('predictions').select('*'),
    ])
    if (pls) setPlayers(pls)
    if (mts) setMatches(mts)
    if (preds) setPredictions(preds)
    setLoading(false)
  }

  function getPred(playerId: string, matchId: number) {
    return predictions.find(p => p.player_id === playerId && p.match_id === matchId)?.predicted_winner || null
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a6090' }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <h1 style={{ color: '#e8edf5', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Tüm Tahminler</h1>
          <p style={{ color: '#4a6090', fontSize: 13, margin: 0 }}>{players.length} katılımcı tahminini kilitledi</p>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏠 Ana Sayfa</Link>
          <Link href="/bracket" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>⚽ Bracket</Link>
          <Link href="/leaderboard" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏅 Lider</Link>
        </div>

        {/* Oyuncu kartları */}
        {!selected && (
          <>
            {players.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#4a6090', padding: '60px 0' }}>
                Henüz kimse tahminini kilitlemedi.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p); setSelectedRound('r32') }}
                    style={{
                      background: '#0a1628', border: '1px solid #1a2a4a',
                      borderRadius: 16, padding: '20px 12px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4a7fcb'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2a4a'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1f', border: '2px solid #1e3060' }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 28 }}>{p.emoji || '⚽'}</span>
                      }
                    </div>
                    <div style={{ color: '#e8edf5', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{p.nickname}</div>
                    <div style={{ color: '#4a7fcb', fontSize: 11 }}>Bracket'i gör →</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Seçili oyuncunun bracket'i */}
        {selected && (
          <div>
            {/* Geri + oyuncu başlığı */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <button
                onClick={() => setSelected(null)}
                style={{ background: '#0a1628', border: '1px solid #1a2a4a', color: '#8a9bbf', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
              >
                ← Geri
              </button>
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1f', border: '2px solid #1e3060' }}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 26 }}>{selected.emoji || '⚽'}</span>
                }
              </div>
              <div>
                <div style={{ color: '#e8edf5', fontWeight: 800, fontSize: 18 }}>{selected.nickname}</div>
                <div style={{ color: '#4a6090', fontSize: 12 }}>tahminleri</div>
              </div>
            </div>

            {/* Tur seçici */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {ROUNDS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: selectedRound === r ? '#1d4ed8' : '#0a1628',
                    color: selectedRound === r ? 'white' : '#4a6090',
                    outline: selectedRound === r ? 'none' : '1px solid #1a2a4a'
                  }}
                >
                  {ROUND_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Maçlar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matches.filter(m => m.round === selectedRound).map(match => {
                const pred = getPred(selected.id, match.id)
                const isCorrect = match.winner && pred === match.winner
                const isWrong = match.winner && pred && pred !== match.winner

                return (
                  <div key={match.id} style={{
                    background: '#0a1628', border: '1px solid #1a2a4a',
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
                  }}>
                    {/* Maç */}
                    <div>
                      <div style={{ color: '#8a9bbf', fontSize: 13, fontWeight: 600 }}>
                        {match.team_a || '?'} <span style={{ color: '#2a3a5c' }}>vs</span> {match.team_b || '?'}
                      </div>
                      {match.winner && (
                        <div style={{ color: '#2ed573', fontSize: 11, marginTop: 3 }}>✓ {match.winner} kazandı</div>
                      )}
                    </div>

                    {/* Tahmin */}
                    <div style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: isCorrect ? 'rgba(46,213,115,0.15)' : isWrong ? 'rgba(231,76,60,0.15)' : 'rgba(74,127,203,0.1)',
                      color: isCorrect ? '#2ed573' : isWrong ? '#e74c3c' : '#8a9bbf',
                      border: `1px solid ${isCorrect ? 'rgba(46,213,115,0.3)' : isWrong ? 'rgba(231,76,60,0.3)' : '#1a2a4a'}`
                    }}>
                      {pred || '—'}
                      {isCorrect && ' ✓'}
                      {isWrong && ' ✗'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
