'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateToken, hashToken } from '@/lib/token'

const EMOJIS = ['⚽','🏆','🔥','⚡','🦁','🐯','🦊','🐺','🦅','🦋','💀','👑','🎯','🚀','💎','🌟','🇹🇷','❤️','🤙','😎']

export default function HomePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [nickname, setNickname] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('⚽')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Görsel 10MB\'dan küçük olmalı.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(playerId: string, file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${playerId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleJoin() {
    const nick = nickname.trim()
    if (!nick) return setError('İsim yazman lazım!')
    if (nick.length < 2) return setError('En az 2 karakter olmalı.')
    if (nick.length > 20) return setError('En fazla 20 karakter olabilir.')
    setLoading(true)
    setError('')
    try {
      const { data: existing } = await supabase
        .from('players').select('id, token_hash').eq('nickname', nick).single()

      if (existing) {
        const storedToken = localStorage.getItem('wc_token')
        if (storedToken) {
          const hash = await hashToken(storedToken)
          if (hash === existing.token_hash) {
            localStorage.setItem('wc_player_id', existing.id)
            localStorage.setItem('wc_nickname', nick)
            router.push('/bracket')
            return
          }
        }
        setError('Bu isim zaten alınmış! Başka bir isim dene.')
        setLoading(false)
        return
      }

      const token = generateToken()
      const hash = await hashToken(token)
      const { data: newPlayer, error: insertError } = await supabase
        .from('players').insert({ nickname: nick, emoji: selectedEmoji, token_hash: hash })
        .select('id').single()
      if (insertError) throw insertError

      let avatarUrl: string | null = null
      if (avatarFile) avatarUrl = await uploadAvatar(newPlayer.id, avatarFile)
      if (avatarUrl) await supabase.from('players').update({ avatar_url: avatarUrl }).eq('id', newPlayer.id)

      await supabase.from('scores').insert({ player_id: newPlayer.id })

      localStorage.setItem('wc_token', token)
      localStorage.setItem('wc_player_id', newPlayer.id)
      localStorage.setItem('wc_nickname', nick)
      localStorage.setItem('wc_emoji', selectedEmoji)
      if (avatarUrl) localStorage.setItem('wc_avatar', avatarUrl)

      router.push('/bracket')
    } catch (err: unknown) {
      const e = err as {message?: string; details?: string; code?: string}
      setError(e?.message || e?.details || e?.code || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 40%, #07112a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Arkaplan efekti */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,127,203,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Üst logo */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, #1e3060)' }} />
          <span style={{ fontSize: 11, color: '#2a4070', fontWeight: 700, letterSpacing: 4 }}>FIFA</span>
          <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, #1e3060, transparent)' }} />
        </div>
        <div style={{
          fontSize: 72, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #f0b429 0%, #fff 50%, #f0b429 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -4, marginBottom: 4
        }}>26</div>
        <div style={{ fontSize: 13, color: '#4a6090', fontWeight: 700, letterSpacing: 6 }}>WORLD CUP</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#dde8ff', marginTop: 12, letterSpacing: -0.5 }}>
          Yıkıklar Cemiyeti
        </div>
        <div style={{ fontSize: 12, color: '#2a4070', marginTop: 4 }}>Bracket Tahmin Yarışması</div>
      </div>

      {/* Kart */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(10,18,38,0.8)',
        border: '1px solid #0f2040',
        borderRadius: 20, padding: 32,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        position: 'relative'
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#dde8ff', textAlign: 'center', margin: '0 0 24px' }}>
          Tahmine Katıl
        </h2>

        {/* Avatar + Nickname yan yana */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
          {/* Avatar yükleme */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#4a6090', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
              FOTOĞRAF
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '2px dashed #1e3060',
                background: avatarPreview ? 'transparent' : '#080f20',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.2s',
                padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#4a7fcb')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = avatarPreview ? '#4a7fcb' : '#1e3060')}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>📷</div>
                  <div style={{ fontSize: 9, color: '#2a4070', marginTop: 2 }}>Yükle</div>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {avatarPreview && (
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                style={{ display: 'block', fontSize: 10, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', margin: '4px auto 0', textAlign: 'center', width: '100%' }}
              >
                Kaldır
              </button>
            )}
          </div>

          {/* Nickname */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#4a6090', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
              NİCKNAME
            </div>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="örn: KralYavuz"
              maxLength={20}
              style={{
                width: '100%', background: '#060d1f',
                border: '1px solid #0f2040',
                borderRadius: 10, padding: '11px 14px',
                color: '#dde8ff', fontSize: 15, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#4a7fcb')}
              onBlur={e => (e.target.style.borderColor = '#0f2040')}
            />
            <div style={{ fontSize: 10, color: '#2a4070', marginTop: 6 }}>
              {nickname.length}/20 karakter
            </div>
          </div>
        </div>

        {/* Emoji seçici - fotoğraf yüklenmemişse göster */}
        <div style={{ marginBottom: 24, display: avatarPreview ? 'none' : 'block' }}>
          <div style={{ fontSize: 11, color: '#4a6090', fontWeight: 700, letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            EMOJİN
            <span style={{ fontSize: 20, lineHeight: 1 }}>{selectedEmoji}</span>
          </div>
          <div style={{
            background: '#060d1f', border: '1px solid #0f2040',
            borderRadius: 12, padding: '10px 8px',
            display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4,
          }}>
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                style={{
                  fontSize: 19, padding: '5px 2px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', transition: 'all 0.12s',
                  background: selectedEmoji === emoji ? 'rgba(74,127,203,0.25)' : 'transparent',
                  outline: selectedEmoji === emoji ? '1.5px solid #4a7fcb' : 'none',
                  transform: selectedEmoji === emoji ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Hata */}
        {error && (
          <div style={{
            background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
            color: '#e74c3c', borderRadius: 10, padding: '10px 14px',
            fontSize: 13, textAlign: 'center', marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {/* Giriş butonu */}
        <button
          onClick={handleJoin}
          disabled={loading || !nickname.trim()}
          style={{
            width: '100%',
            background: loading || !nickname.trim()
              ? '#0a1628'
              : 'linear-gradient(135deg, #f0b429, #e8a020)',
            color: loading || !nickname.trim() ? '#2a4070' : '#060d1f',
            fontWeight: 800, fontSize: 15, padding: '14px',
            borderRadius: 12, border: loading || !nickname.trim() ? '1px solid #0f2040' : 'none',
            cursor: loading || !nickname.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', letterSpacing: 0.3,
          }}
        >
          {loading ? 'Giriliyor...' : '🏆  Tahmine Başla'}
        </button>

      </div>

      {/* Alt linkler */}
      <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
        <a href="/leaderboard" style={{ fontSize: 13, color: '#2a4070', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#8a9bbf')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a4070')}>
          🏅 Lider Tablosu
        </a>
        <a href="/tahminler" style={{ fontSize: 13, color: '#2a4070', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#8a9bbf')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a4070')}>
          📊 Tüm Tahminler
        </a>
      </div>
    </div>
  )
}
