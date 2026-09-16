import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { ReportCategory } from '../types'
import { LocationPicker } from './LocationPicker'

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'fly-tipping', label: 'Fly-tipping' },
  { value: 'pothole', label: 'Pothole' },
  { value: 'other', label: 'Other' },
]

interface ReportFormProps {
  onSubmitted: () => void
}

export function ReportForm({ onSubmitted }: ReportFormProps) {
  const [category, setCategory] = useState<ReportCategory>('fly-tipping')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file)
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const resetForm = () => {
    setCategory('fly-tipping')
    setDescription('')
    handlePhotoChange(null)
    setPosition(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!description.trim()) {
      setError('Please add a short description.')
      return
    }
    if (!photo) {
      setError('Please add a photo.')
      return
    }
    if (!position) {
      setError('Please set a location by tapping the map or using your location.')
      return
    }

    setSubmitting(true)
    try {
      const fileExt = photo.name.split('.').pop() ?? 'jpg'
      const filePath = `${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(filePath, photo)
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('report-photos').getPublicUrl(filePath)

      const { error: insertError } = await supabase.from('reports').insert({
        category,
        description: description.trim(),
        photo_url: publicUrl,
        lat: position.lat,
        lng: position.lng,
        status: 'Reported',
      })
      if (insertError) throw insertError

      setSuccess(true)
      resetForm()
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what you're reporting"
          rows={3}
        />
      </label>

      <label className="field">
        <span>Photo</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
        />
        {photoPreview && <img className="photo-preview" src={photoPreview} alt="Selected report" />}
      </label>

      <label className="field">
        <span>Location</span>
        <LocationPicker position={position} onChange={setPosition} />
      </label>

      {error && <p className="field-error">{error}</p>}
      {success && <p className="field-success">Report submitted. Thank you.</p>}

      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit report'}
      </button>
    </form>
  )
}
