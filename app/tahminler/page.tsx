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

  const roundMatches = matches.filter(m => m.round === selectedRound)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a6090' }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f', padding: '32px 16px' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>📋</div>
          <h1 style={{ color: '#e8edf5', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Tüm Tahminler</h1>
          <p style={{ color: '#4a6090', fontSize: 13, margin: 0 }}>{players.length} katılımcı</p>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏠 Ana Sayfa</Link>
          <Link href="/bracket" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>⚽ Bracket</Link>
          <Link href="/leaderboard" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏅 Lider</Link>
        </div>

        {/* Tur seçici */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
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

        {players.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a6090', padding: '60px 0' }}>
            Henüz kimse tahminini kilitlemedi.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#4a6090', fontWeight: 600, borderBottom: '1px solid #1a2a4a', minWidth: 180, position: 'sticky', left: 0, background: '#060d1f', zIndex: 2 }}>
                    Maç
                  </th>
                  {players.map(p => (
                    <th key={p.id} style={{ padding: '10px 12px', borderBottom: '1px solid #1a2a4a', minWidth: 110, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628', border: '2px solid #1e3060' }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 20 }}>{p.emoji || '⚽'}</span>
                          }
                        </div>
                        <span style={{ color: '#dde8ff', fontWeight: 700, fontSize: 12 }}>{p.nickname}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundMatches.map((match, i) => (
                  <tr key={match.id} style={{ background: i % 2 === 0 ? '#0a1628' : 'transparent' }}>
                    {/* Maç bilgisi */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #0f1e38', position: 'sticky', left: 0, background: i % 2 === 0 ? '#0a1628' : '#060d1f', zIndex: 1 }}>
                      <div style={{ color: '#dde8ff', fontWeight: 600 }}>
                        {match.team_a || '?'} <span style={{ color: '#2a3a5c' }}>vs</span> {match.team_b || '?'}
                      </div>
                      {match.winner && (
                        <div style={{ color: '#2ed573', fontSize: 11, marginTop: 3 }}>✓ {match.winner}</div>
                      )}
                    </td>

                    {/* Her oyuncunun tahmini */}
                    {players.map(p => {
                      const pred = getPred(p.id, match.id)
                      const isCorrect = !!(match.winner && pred === match.winner)
                      const isWrong = !!(match.winner && pred && pred !== match.winner)
                      return (
                        <td key={p.id} style={{ padding: '12px 8px', borderBottom: '1px solid #0f1e38', textAlign: 'center' }}>
                          {pred ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              background: isCorrect ? 'rgba(46,213,115,0.15)' : isWrong ? 'rgba(231,76,60,0.15)' : 'rgba(74,127,203,0.08)',
                              color: isCorrect ? '#2ed573' : isWrong ? '#e74c3c' : '#8a9bbf',
                              border: `1px solid ${isCorrect ? 'rgba(46,213,115,0.3)' : isWrong ? 'rgba(231,76,60,0.3)' : '#1a2a4a'}`
                            }}>
                              {pred}
                            </span>
                          ) : (
                            <span style={{ color: '#2a3a5c', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
