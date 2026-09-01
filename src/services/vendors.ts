import { supabase } from '../lib/supabase'
import type { Vendor } from '../types/database'

export type CreateVendorInput = {
  companyName: string
  contactName: string
  email: string
  temporaryPassword: string
}

export async function listVendors() {
  const { data, error } = await supabase.from('vendor_metrics').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVendor(input: CreateVendorInput) {
  const { data, error } = await supabase.functions.invoke('create-vendor', { body: input })
  if (error) throw error
  return data as { vendor: Vendor }
}

export async function setVendorStatus(vendorId: string, status: 'active' | 'disabled') {
  const { data, error } = await supabase.functions.invoke('manage-vendor', {
    body: { vendorId, enabled: status === 'active' },
  })
  if (error) throw error
  return data
}
