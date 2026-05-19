import { sb } from './supabase'
import { mQ, mS, mI, mSh, mC } from './mappers'
import { DOBS, DSPECS } from './constants'

export const loadAll = async (userId) => {
  const [q, sa, ins, sh, cat, set_] = await Promise.all([
    sb.from('quotes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('sales').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('installations').select('*').eq('user_id', userId),
    sb.from('shipments').select('*').eq('user_id', userId),
    sb.from('catalog_items').select('*').eq('user_id', userId),
    sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])
  const cats = cat.data || []
  return {
    quotes: (q.data || []).map(mQ),
    sales: (sa.data || []).map(mS),
    installations: (ins.data || []).map(mI),
    shipments: (sh.data || []).map(mSh),
    catalog: {
      labor: cats.filter(c => c.type === 'labor').map(mC),
      shipping: cats.filter(c => c.type === 'shipping').map(mC),
    },
    settings: {
      defaultObservations: set_.data?.default_observations || DOBS,
      defaultSpecifications: set_.data?.default_specifications || DSPECS,
    },
  }
}
