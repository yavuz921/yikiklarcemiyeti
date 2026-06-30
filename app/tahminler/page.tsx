'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Match, Player, Prediction } from '@/lib/types'
import Link from 'next/link'

const FLAGS: Record<string, string> = {
  'Germany': '🇩🇪', 'Paraguay': '🇵🇾', 'France': '🇫🇷', 'Sweden': '🇸🇪',
  'South Africa': '🇿🇦', 'Canada': '🇨🇦', 'Netherlands': '🇳🇱', 'Morocco': '🇲🇦',
  'Portugal': '🇵🇹', 'Croatia': '🇭🇷', 'Spain': '🇪🇸', 'Austria': '🇦🇹',
  'United States': '🇺🇸', 'Bosnia & Herzegovina': '🇧🇦', 'Belgium': '🇧🇪', 'Senegal': '🇸🇳',
  'Brazil': '🇧🇷', 'Japan': '🇯🇵', 'Ivory Coast': '🇨🇮', 'Norway': '🇳🇴',
  'Mexico': '🇲🇽', 'Ecuador': '🇪🇨', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DR Congo': '🇨🇩',
  'Argentina': '🇦🇷', 'Cape Verde': '🇨🇻', 'Australia': '🇦🇺', 'Egypt': '🇪🇬',
  'Switzerland': '🇨🇭', 'Algeria': '🇩🇿', 'Colombia': '🇨🇴', 'Ghana': '🇬🇭',
}

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Çeyrek Final', sf: 'Yarı Final', final: 'Final'
}

export default function TahminlerPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [tournamentLocked, setTournamentLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState<string>('r32')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [{ data: pls }, { data: mts }, { data: preds }, { data: settings }] = await Promise.all([
      supabase.from('players').select('*').eq('is_locked', true),
      supabase.from('matches').select('*').order('id'),
      supabase.from('predictions').select('*'),
      supabase.from('app_settings').select('tournament_locked').eq('id', 1).single(),
    ])
    if (pls) setPlayers(pls)
    if (mts) setMatches(mts)
    if (preds) setPredictions(preds)
    if (settings) setTournamentLocked(settings.tournament_locked)
    setLoading(false)
  }

  if (!tournamentLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Henüz Görüntülenemez</h1>
          <p className="text-gray-400 mb-6">Tahminler turnuva başladıktan sonra herkes için açılır.</p>
          <Link href="/" className="text-blue-400 hover:text-white transition">← Ana Sayfaya Dön</Link>
        </div>
      </div>
    )
  }

  const rounds = ['r32', 'r16', 'qf', 'sf', 'final']
  const roundMatches = matches.filter(m => m.round === selectedRound)
  const lockedPlayers = players.filter(p => p.is_locked)

  function getPrediction(playerId: string, matchId: number) {
    return predictions.find(p => p.player_id === playerId && p.match_id === matchId)?.predicted_winner || null
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-3xl font-bold text-white">Tüm Tahminler</h1>
          <p className="text-gray-400 text-sm mt-1">{lockedPlayers.length} katılımcı</p>
        </div>

        {/* Nav */}
        <div className="flex gap-3 mb-6 justify-center flex-wrap">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">🏠 Ana Sayfa</Link>
          <Link href="/bracket" className="text-sm text-gray-400 hover:text-white transition">📋 Bracket</Link>
          <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition">🏅 Lider</Link>
        </div>

        {/* Tur seçici */}
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {rounds.map(r => (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selectedRound === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {ROUND_LABELS[r]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium min-w-[120px]">Maç</th>
                  {lockedPlayers.map(p => (
                    <th key={p.id} className="py-3 px-3 text-center min-w-[100px]">
                      <div className="text-xl">{p.emoji}</div>
                      <div className="text-xs text-gray-300 font-medium">{p.nickname}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundMatches.map(match => (
                  <tr key={match.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-3">
                      <div className="text-xs text-gray-500 mb-0.5">{ROUND_LABELS[match.round]}</div>
                      <div className="font-medium text-white">
                        {(FLAGS[match.team_a || ''] || '') + ' ' + (match.team_a || '?')}
                        <span className="text-gray-500 mx-1">vs</span>
                        {(FLAGS[match.team_b || ''] || '') + ' ' + (match.team_b || '?')}
                      </div>
                      {match.winner && (
                        <div className="text-xs text-green-400 mt-0.5">✓ {match.winner} kazandı</div>
                      )}
                    </td>
                    {lockedPlayers.map(p => {
                      const pred = getPrediction(p.id, match.id)
                      const isCorrect = match.winner && pred === match.winner
                      const isWrong = match.winner && pred && pred !== match.winner
                      return (
                        <td key={p.id} className="py-3 px-3 text-center">
                          {pred ? (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              isCorrect ? 'bg-green-500/20 text-green-400' :
                              isWrong ? 'bg-red-500/20 text-red-400' :
                              'bg-white/10 text-gray-300'
                            }`}>
                              {FLAGS[pred] || ''} {pred}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
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
