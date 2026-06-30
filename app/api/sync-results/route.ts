import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POINTS: Record<string, number> = { r32: 1, r16: 2, qf: 4, sf: 8, final: 16 }

const TEAM_MAP: Record<string, string> = {
  'Germany': 'Germany',
  'Paraguay': 'Paraguay',
  'France': 'France',
  'Sweden': 'Sweden',
  'South Africa': 'South Africa',
  'Canada': 'Canada',
  'Netherlands': 'Netherlands',
  'Morocco': 'Morocco',
  'Portugal': 'Portugal',
  'Croatia': 'Croatia',
  'Spain': 'Spain',
  'Austria': 'Austria',
  'United States': 'United States',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Belgium': 'Belgium',
  'Senegal': 'Senegal',
  'Brazil': 'Brazil',
  'Japan': 'Japan',
  "Côte d'Ivoire": 'Ivory Coast',
  'Ivory Coast': 'Ivory Coast',
  'Norway': 'Norway',
  'Mexico': 'Mexico',
  'Ecuador': 'Ecuador',
  'England': 'England',
  'Congo DR': 'DR Congo',
  'DR Congo': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Argentina': 'Argentina',
  'Cape Verde Islands': 'Cape Verde',
  'Cape Verde': 'Cape Verde',
  'Australia': 'Australia',
  'Egypt': 'Egypt',
  'Switzerland': 'Switzerland',
  'Algeria': 'Algeria',
  'Colombia': 'Colombia',
  'Ghana': 'Ghana',
}

const STAGE_MAP: Record<string, string> = {
  'LAST_32': 'r32',
  'ROUND_OF_32': 'r32',
  'LAST_16': 'r16',
  'ROUND_OF_16': 'r16',
  'QUARTER_FINALS': 'qf',
  'SEMI_FINALS': 'sf',
  'FINAL': 'final',
}

async function recalculateScores() {
  const { data: allMatches } = await supabase.from('matches').select('*')
  const { data: allPreds } = await supabase.from('predictions').select('*')
  const { data: allPlayers } = await supabase.from('players').select('id')
  if (!allMatches || !allPreds || !allPlayers) return

  for (const player of allPlayers) {
    const preds = allPreds.filter(p => p.player_id === player.id)
    let total = 0, correct = 0
    for (const pred of preds) {
      const match = allMatches.find(m => m.id === pred.match_id)
      if (match?.winner && match.winner === pred.predicted_winner) {
        total += POINTS[match.round] || 1
        correct++
      }
    }
    await supabase.from('scores').upsert(
      { player_id: player.id, total_points: total, correct_predictions: correct, updated_at: new Date().toISOString() },
      { onConflict: 'player_id' }
    )
  }

  const { data: scoreData } = await supabase.from('scores').select('player_id, total_points').order('total_points', { ascending: false })
  if (scoreData) {
    for (let i = 0; i < scoreData.length; i++) {
      await supabase.from('scores').update({ rank: i + 1 }).eq('player_id', scoreData[i].player_id)
    }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const key = req.nextUrl.searchParams.get('key')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! },
      cache: 'no-store'
    })

    if (!res.ok) {
      return NextResponse.json({ error: `API error: ${res.status}`, detail: await res.text() }, { status: 500 })
    }

    const apiData = await res.json()
    const apiMatches: Record<string, unknown>[] = apiData.matches || []

    // Sadece eleme turu + bitmiş
    const finished = apiMatches.filter(m =>
      m.status === 'FINISHED' && STAGE_MAP[m.stage as string]
    )

    let updated = 0
    const log: string[] = []

    for (const apiMatch of finished) {
      const stage = STAGE_MAP[apiMatch.stage as string]
      const homeTeam = apiMatch.homeTeam as Record<string, string>
      const awayTeam = apiMatch.awayTeam as Record<string, string>
      const score = apiMatch.score as Record<string, unknown>

      const homeRaw = homeTeam.name
      const awayRaw = awayTeam.name
      const scoreWinner = score.winner as string // HOME_TEAM | AWAY_TEAM | DRAW

      const home = TEAM_MAP[homeRaw]
      const away = TEAM_MAP[awayRaw]

      if (!home || !away || !scoreWinner || scoreWinner === 'DRAW') continue

      // Kazananı belirle (API'nin winner alanı daha güvenilir — penaltıları da kapsar)
      const winner = scoreWinner === 'HOME_TEAM' ? home : away

      // DB'de maçı bul (her iki sırayla)
      let dbMatch = null
      const { data: m1 } = await supabase.from('matches').select('id, winner').eq('team_a', home).eq('team_b', away).eq('round', stage).single()
      if (m1) dbMatch = m1
      else {
        const { data: m2 } = await supabase.from('matches').select('id, winner').eq('team_a', away).eq('team_b', home).eq('round', stage).single()
        if (m2) dbMatch = m2
      }

      if (!dbMatch) {
        log.push(`⚠️ Bulunamadı: ${home} vs ${away} (${stage})`)
        continue
      }

      // Sadece değişiklik varsa güncelle
      if (dbMatch.winner !== winner) {
        await supabase.from('matches').update({ winner }).eq('id', dbMatch.id)
        log.push(`✓ #${dbMatch.id} ${home} vs ${away} → ${winner}`)
        updated++
      }
    }

    if (updated > 0) await recalculateScores()

    return NextResponse.json({
      success: true,
      updated,
      total_finished: finished.length,
      log,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
