'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Player } from '@/lib/types'
import Link from 'next/link'

export default function TahminlerPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('players').select('*').eq('is_locked', true).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a6090' }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f', padding: '32px 16px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <h1 style={{ color: '#e8edf5', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Tüm Tahminler</h1>
          <p style={{ color: '#4a6090', fontSize: 13, margin: 0 }}>{players.length} katılımcı</p>
        </div>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏠 Ana Sayfa</Link>
          <Link href="/bracket" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>⚽ Bracket</Link>
          <Link href="/leaderboard" style={{ fontSize: 13, color: '#4a6090', textDecoration: 'none' }}>🏅 Lider</Link>
        </div>

        {players.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a6090', padding: '60px 0' }}>
            Henüz kimse tahminini kilitlemedi.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {players.map(p => (
              <Link key={p.id} href={`/tahminler/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#0a1628', border: '1px solid #1a2a4a', borderRadius: 16,
                  padding: '20px 12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4a7fcb'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a2a4a'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1f', border: '2px solid #1e3060' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 28 }}>{p.emoji || '⚽'}</span>
                    }
                  </div>
                  <div style={{ color: '#e8edf5', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{p.nickname}</div>
                  <div style={{ color: '#4a7fcb', fontSize: 11 }}>Bracket'i gör →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
