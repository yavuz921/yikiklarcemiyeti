import { NextRequest, NextResponse } from 'next/server'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const POINTS: Record<string, number> = { r32: 1, r16: 2, qf: 4, sf: 8, final: 16 }

async function dbGet(path: string) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    cache: 'no-store'
  })
  return res.json()
}

async function dbPatch(path: string, body: Record<string, unknown>) {
  await fetch(`${URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  })
}

async function dbUpsert(path: string, body: Record<string, unknown>, onConflict: string) {
  await fetch(`${URL}/rest/v1/${path}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body)
  })
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [allMatches, allPreds, allPlayers] = await Promise.all([
      dbGet('matches?select=*'),
      dbGet('predictions?select=*'),
      dbGet('players?select=id'),
    ])

    for (const player of allPlayers) {
      const preds = allPreds.filter((p: Record<string, unknown>) => p.player_id === player.id)
      let total = 0, correct = 0
      for (const pred of preds) {
        const match = allMatches.find((m: Record<string, unknown>) => m.id === pred.match_id)
        if (match?.winner && match.winner === pred.predicted_winner) {
          total += POINTS[match.round as string] || 1
          correct++
        }
      }
      await dbUpsert('scores', {
        player_id: player.id,
        total_points: total,
        correct_predictions: correct,
        updated_at: new Date().toISOString()
      }, 'player_id')
    }

    // Rank güncelle
    const scoreData = await dbGet('scores?select=player_id,total_points&order=total_points.desc')
    for (let i = 0; i < scoreData.length; i++) {
      await dbPatch(`scores?player_id=eq.${scoreData[i].player_id}`, { rank: i + 1 })
    }

    return NextResponse.json({ success: true, players: allPlayers.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
