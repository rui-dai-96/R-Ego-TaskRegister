import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Vendor } from '../types/database'

export type CreateVendorInput = {
  companyName: string
  contactName: string
  email: string
  temporaryPassword: string
}

async function throwFunctionError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      const message = typeof body?.error === 'string' ? body.error : null
      if (message) throw new Error(message)
    } catch (parsed) {
      if (parsed instanceof Error && parsed.message !== error.message) throw parsed
    }
  }
  throw error instanceof Error ? error : new Error('请求失败，请稍后重试')
}

export async function listVendors() {
  const { data, error } = await supabase.from('vendor_metrics').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVendor(input: CreateVendorInput) {
  if (input.temporaryPassword.length < 10) {
    throw new Error('临时密码至少需要 10 个字符')
  }
  const { data, error } = await supabase.functions.invoke('create-vendor', { body: input })
  if (error) await throwFunctionError(error)
  return data as { vendor: Vendor }
}

export async function setVendorStatus(vendorId: string, status: 'active' | 'disabled') {
  const { data, error } = await supabase.functions.invoke('manage-vendor', {
    body: { vendorId, enabled: status === 'active' },
  })
  if (error) await throwFunctionError(error)
  return data
}
