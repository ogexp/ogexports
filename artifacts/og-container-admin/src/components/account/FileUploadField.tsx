import { useRef } from "react"
import { useUpload } from "@workspace/object-storage-web"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, UploadCloud } from "lucide-react"

interface FileUploadFieldProps {
  label: string
  description?: string
  required?: boolean
  value?: string | null
  onChange: (objectPath: string, fileName: string) => void
  accept?: string
}

export function FileUploadField({
  label,
  description,
  required,
  value,
  onChange,
  accept = "application/pdf,image/*",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading, progress, error } = useUpload({
    basePath: "/api/uploads",
    onSuccess: (response: { objectPath: string; metadata: { name: string } }) =>
      onChange(response.objectPath, response.metadata.name),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
          </span>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void uploadFile(file)
          e.target.value = ""
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        data-testid={`button-upload-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      >
        <UploadCloud className="w-4 h-4" />
        {isUploading ? "Uploading..." : value ? "Replace file" : "Choose file"}
      </Button>
      {isUploading && <Progress value={progress} className="h-1.5" />}
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  )
}
