import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Category } from '../types'

// Used until the list has loaded, and if it cannot be loaded. The database is the real list.
export const FALLBACK_CATEGORIES: Category[] = [
  { code: 'fly-tipping', label: 'Fly-tipping', position: 1 },
  { code: 'pothole', label: 'Pothole', position: 2 },
  { code: 'graffiti', label: 'Graffiti', position: 3 },
  { code: 'abandoned-vehicle', label: 'Abandoned vehicle', position: 4 },
  { code: 'damaged-infrastructure', label: 'Damaged infrastructure', position: 5 },
  { code: 'other', label: 'Other', position: 6 },
]

let cached: Promise<Category[]> | null = null

function loadCategories(): Promise<Category[]> {
  cached ??= (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('code, label, position')
      .eq('active', true)
      .order('position', { ascending: true })
    if (error || !data || data.length === 0) {
      cached = null // try again next time
      return FALLBACK_CATEGORIES
    }
    return data as Category[]
  })()
  return cached
}

export function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES)
  useEffect(() => {
    let alive = true
    loadCategories().then((list) => alive && setCategories(list))
    return () => {
      alive = false
    }
  }, [])
  return categories
}
