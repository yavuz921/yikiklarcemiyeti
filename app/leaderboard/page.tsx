'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Score } from '@/lib/types'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    setMyId(localStorage.getItem('wc_player_id'))
    loadScores()
    const channel = supabase
      .channel('scores-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, loadScores)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadScores() {
    const { data } = await supabase
      .from('scores')
      .select('*, players!inner(nickname, emoji, avatar_url, is_locked)')
      .eq('players.is_locked', true)
      .order('total_points', { ascending: false })
    if (data) setScores(data as Score[])
    setLoading(false)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ minHeight: '100vh', background: '#0f1729', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>🏅</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e8edf5', margin: 0 }}>Lider Tablosu</h1>
          <p style={{ color: '#8a9bbf', fontSize: '13px', marginTop: '6px' }}>Gerçek zamanlı güncellenir</p>
        </div>

        {/* Ödül */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1628, #0f1e3a)',
          border: '1px solid #f0b42944',
          borderRadius: 20, padding: '20px 24px',
          marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20
        }}>
          <img
            src="https://vozolpremiumx.com/wp-content/uploads/2026/06/vozol-star-40000-blueberry-mint.jpg.webp"
            alt="Vozol Star 40000"
            style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 11, color: '#f0b429', fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>🥇 BİRİNCİYE ÖDÜL</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e8edf5' }}>4000 Çekim Vozol</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#8a9bbf', textDecoration: 'none' }}>🏠 Ana Sayfa</Link>
          <Link href="/bracket" style={{ fontSize: '13px', color: '#8a9bbf', textDecoration: 'none' }}>📋 Bracket</Link>
          <Link href="/tahminler" style={{ fontSize: '13px', color: '#8a9bbf', textDecoration: 'none' }}>📊 Tahminler</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a9bbf', padding: '60px 0' }}>Yükleniyor...</div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a5d7a', padding: '60px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>😴</div>
            <div>Henüz kimse puan kazanmadı</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scores.map((score, i) => {
              const isMe = score.player_id === myId
              return (
                <div key={score.player_id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  background: isMe ? 'rgba(74,127,203,0.15)' : '#1a2540',
                  border: `1px solid ${isMe ? '#4a7fcb' : '#2a3a5c'}`,
                  borderRadius: '16px', padding: '16px 20px',
                  transition: 'transform 0.1s'
                }}>
                  {/* Sıra */}
                  <div style={{ width: '32px', textAlign: 'center', fontSize: '22px' }}>
                    {i < 3 ? medals[i] : <span style={{ color: '#8a9bbf', fontWeight: 700, fontSize: '16px' }}>#{i + 1}</span>}
                  </div>

                  {/* Avatar veya emoji */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628', border: '2px solid #1e3060' }}>
                    {score.players?.avatar_url
                      ? <img src={score.players.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 26 }}>{score.players?.emoji || '⚽'}</span>
                    }
                  </div>

                  {/* İsim */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#e8edf5', fontSize: '16px' }}>
                      {score.players?.nickname}
                      {isMe && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#4a7fcb' }}>(sen)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8a9bbf', marginTop: '2px' }}>
                      {score.correct_predictions} doğru tahmin
                    </div>
                  </div>

                  {/* Puan */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#f0b429' }}>{score.total_points}</div>
                    <div style={{ fontSize: '11px', color: '#4a5d7a' }}>puan</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
