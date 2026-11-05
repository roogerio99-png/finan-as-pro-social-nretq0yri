import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')

    const data = error.response?.data
    if (data && typeof data === 'object') {
      if ('message' in data && typeof (data as { message: unknown }).message === 'string') {
        const msg = (data as { message: string }).message
        if (msg && msg !== 'Something went wrong while processing your request.') {
          return msg
        }
      }
    }

    if (error.response?.message && typeof error.response.message === 'string') {
      const respMsg = error.response.message
      if (respMsg && respMsg !== 'Something went wrong while processing your request.') {
        return respMsg
      }
    }

    if (error.message && error.message !== 'Something went wrong while processing your request.') {
      return error.message
    }
    return 'Ocorreu um erro ao processar a requisição no servidor.'
  }

  if (error instanceof Error) {
    return error.message || 'Ocorreu um erro inesperado.'
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Ocorreu um erro inesperado.'
}
