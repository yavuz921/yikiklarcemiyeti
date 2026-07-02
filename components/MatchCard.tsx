'use client'

import { Match } from '@/lib/types'

export const COUNTRY_CODES: Record<string, string> = {
  'Germany': 'de', 'Paraguay': 'py', 'France': 'fr', 'Sweden': 'se',
  'South Africa': 'za', 'Canada': 'ca', 'Netherlands': 'nl', 'Morocco': 'ma',
  'Portugal': 'pt', 'Croatia': 'hr', 'Spain': 'es', 'Austria': 'at',
  'United States': 'us', 'Bosnia & Herzegovina': 'ba', 'Belgium': 'be', 'Senegal': 'sn',
  'Brazil': 'br', 'Japan': 'jp', 'Ivory Coast': 'ci', 'Norway': 'no',
  'Mexico': 'mx', 'Ecuador': 'ec', 'England': 'gb-eng', 'DR Congo': 'cd',
  'Argentina': 'ar', 'Cape Verde': 'cv', 'Australia': 'au', 'Egypt': 'eg',
  'Switzerland': 'ch', 'Algeria': 'dz', 'Colombia': 'co', 'Ghana': 'gh',
}

export function FlagImg({ country, size = 24 }: { country: string | null, size?: number }) {
  if (!country) return <div style={{ width: size * 1.4, height: size * 0.93, background: '#1e2e50', borderRadius: 2 }} />
  const code = COUNTRY_CODES[country]
  if (!code) return <span style={{ fontSize: size * 0.7 }}>🏳️</span>
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={country}
      style={{ width: size * 1.4, height: size * 0.93, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
    />
  )
}

interface Props {
  match: Match
  predA: boolean
  predB: boolean
  teamA: string | null
  teamB: string | null
  onSelect: (id: number, winner: string) => void
  locked: boolean
}

export default function MatchCard({ match, predA, predB, teamA, teamB, onSelect, locked }: Props) {
  const played = !!match.winner
  const canPick = !locked && !played && !!teamA && !!teamB

  function Row({ team, selected, won }: { team: string; selected: boolean; won: boolean }) {
    const isHighlighted = won || selected
    return (
      <button
        disabled={!canPick}
        onClick={() => canPick && onSelect(match.id, team)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 8px',
          height: 32,
          background: won
            ? 'rgba(46,204,113,0.18)'
            : selected
            ? 'rgba(74,144,226,0.22)'
            : 'transparent',
          borderLeft: `3px solid ${won ? '#2ecc71' : selected ? '#4a90e2' : 'transparent'}`,
          cursor: canPick ? 'pointer' : 'default',
          border: 'none',
          transition: 'background 0.12s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (canPick) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = won ? 'rgba(46,204,113,0.18)' : selected ? 'rgba(74,144,226,0.22)' : 'transparent' }}
      >
        <FlagImg country={team} size={16} />
        <span style={{
          fontSize: 11.5,
          fontWeight: isHighlighted ? 700 : 500,
          color: won ? '#2ecc71' : selected ? '#7ab8ff' : '#c8d4e8',
          flex: 1,
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: 0.2,
        }}>
          {team}
        </span>
        {won && <span style={{ color: '#2ecc71', fontSize: 11, marginLeft: 2 }}>✓</span>}
        {selected && !won && <span style={{ color: '#4a90e2', fontSize: 11, marginLeft: 2 }}>✓</span>}
      </button>
    )
  }

  if (!teamA && !teamB) {
    return (
      <div style={{
        width: 180, height: 72,
        background: 'rgba(10,18,38,0.6)',
        border: '1px solid #1a2844',
        borderRadius: 8,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {[0, 1].map(i => (
          <div key={i}>
            {i === 1 && <div style={{ height: 1, background: '#1a2844' }} />}
            <div style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 7 }}>
              <div style={{ width: 22, height: 15, background: '#1a2844', borderRadius: 2 }} />
              <div style={{ width: 60, height: 8, background: '#1a2844', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      width: 180,
      height: 72,
      background: '#0c1530',
      border: `1px solid ${played ? '#8B0000' : canPick ? '#2a4070' : '#1a2844'}`,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: canPick ? '0 0 0 1px rgba(74,144,226,0.1)' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      {played && (
        <div style={{
          background: 'linear-gradient(90deg, #7b0000, #a00000)',
          padding: '1px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, height: 14,
        }}>
          <span style={{ fontSize: 7.5, color: '#ffaaaa', fontWeight: 700, letterSpacing: 1 }}>PLAYED</span>
          <span style={{ fontSize: 7.5, color: '#ffcccc', fontWeight: 600 }}>{match.winner?.toUpperCase()} WON</span>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Row team={teamA || ''} selected={predA} won={match.winner === teamA} />
        <div style={{ height: 1, background: '#1a2844', flexShrink: 0 }} />
        <Row team={teamB || ''} selected={predB} won={match.winner === teamB} />
      </div>
    </div>
  )
}
