import { useCallback, useState } from "react"
import { api } from "@/lib/api"

interface UploadResponse {
  data?: {
    path?: string
    name?: string
  }
}

interface UploadSuccess {
  objectPath: string
  metadata: { name: string }
}

interface UseUploadOptions {
  basePath?: string
  onSuccess?: (response: UploadSuccess) => void
}

export function useUpload({ basePath = "/api/uploads", onSuccess }: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", "kyc")
      const response = await api.upload<UploadResponse>(basePath, form)
      const path = response?.data?.path
      if (!path) throw new Error("The API did not return a stored file path.")

      const uploaded: UploadSuccess = {
        objectPath: path,
        metadata: { name: response.data?.name || file.name },
      }
      setProgress(100)
      onSuccess?.(uploaded)
      return uploaded
    } catch (cause) {
      const uploadError = cause instanceof Error ? cause : new Error("Upload failed.")
      setError(uploadError)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [basePath, onSuccess])

  return { uploadFile, isUploading, progress, error }
}