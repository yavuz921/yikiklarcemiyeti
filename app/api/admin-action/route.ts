import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const POINTS: Record<string, number> = { r32: 1, r16: 2, qf: 4, sf: 8, final: 16 }

const SUPABASE_URL = 'https://gtyodeljhewwqwinnnxl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0eW9kZWxqaGV3d3F3aW5ubnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjc2OTg2OSwiZXhwIjoyMDk4MzQ1ODY5fQ.957e_MTAymJKMfmZzBjnOSmQldYy7fwgz2jz-roiAd8'
const ADMIN_SECRET = 'yavuz1722'

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

async function recalculate(db: ReturnType<typeof adminClient>) {
  const { data: allMatches } = await db.from('matches').select('*')
  const { data: allPreds } = await db.from('predictions').select('*')
  const { data: allPlayers } = await db.from('players').select('id')
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
    await db.from('scores').upsert(
      { player_id: player.id, total_points: total, correct_predictions: correct, updated_at: new Date().toISOString() },
      { onConflict: 'player_id' }
    )
  }

  const { data: scoreData } = await db.from('scores').select('player_id,total_points').order('total_points', { ascending: false })
  if (scoreData) {
    for (let i = 0; i < scoreData.length; i++) {
      await db.from('scores').update({ rank: i + 1 }).eq('player_id', scoreData[i].player_id)
    }
  }
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const db = adminClient()

  // Maç kazananı güncelle
  if (body.action === 'set_winner') {
    const { matchId, winner } = body
    const { error } = await db.from('matches').update({ winner }).eq('id', matchId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await recalculate(db)
    return NextResponse.json({ success: true })
  }

  // Sadece puan yenile
  if (body.action === 'recalculate') {
    await recalculate(db)
    return NextResponse.json({ success: true })
  }

  // Turnuva kilidi
  if (body.action === 'toggle_lock') {
    const { locked } = body
    const { error } = await db.from('app_settings').update({
      tournament_locked: locked,
      lock_time: locked ? new Date().toISOString() : null
    }).eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
