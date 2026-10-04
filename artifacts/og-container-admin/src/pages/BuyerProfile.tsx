import { useRef, useState } from "react"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Camera, Save, Mail, Phone, Globe, Shield, Trash2, Loader2 } from "lucide-react"
import { useLocalAuth } from "@/lib/local-auth"
import { notify } from "@/lib/notify"
import { removeProfileAvatar, resolveMediaUrl, uploadProfileAvatar } from "@/lib/api"

const GOLD = "#C6A969"

export default function BuyerProfile() {
  const { user, updateProfile, refreshUser } = useLocalAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const avatar = resolveMediaUrl(user?.avatarUrl)

  async function handleAvatarFile(file: File) {
    setUploadingAvatar(true)
    try {
      const url = await uploadProfileAvatar(file)
      await refreshUser()
      notify.success("Profile photo updated")
      window.dispatchEvent(new CustomEvent("og-avatar-updated", { detail: { url } }))
    } catch (e: any) {
      notify.error(e?.message || "Unable to upload profile photo")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true)
    try {
      await removeProfileAvatar()
      await refreshUser()
      window.dispatchEvent(new CustomEvent("og-avatar-updated", { detail: { url: "" } }))
      notify.success("Profile photo removed")
    } catch (e: any) {
      notify.error(e?.message || "Unable to remove profile photo")
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { notify.error("Name cannot be empty"); return }
    updateProfile({ fullName: fullName.trim(), phone: phone.trim() })
    notify.success("Profile saved")
  }

  return (
    <BuyerPortalLayout title="My Profile" subtitle="Manage your personal information and profile photo">
      <div className="max-w-3xl space-y-6">

        {/* Avatar + identity */}
        <Card className="glass-card">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden ring-2 ring-[#C6A969] ring-offset-2 ring-offset-background"
                style={{
                  background: avatar ? undefined : "linear-gradient(135deg, #0F3D2E, #4CAF50)",
                  color: "#fff",
                }}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin text-white/90" />
                ) : avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.[0]?.toUpperCase() ?? "B"
                )}
              </div>
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md disabled:opacity-60"
                style={{ background: GOLD, color: "#1F2933" }}
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void handleAvatarFile(f)
                  e.target.value = ""
                }}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-heading font-bold">{user?.fullName ?? "Buyer"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">
                  <Shield className="w-3 h-3 mr-1" /> Verified Trade Account
                </Badge>
                <Badge className="border-0 text-[10px]" style={{ background: "rgba(198,169,105,0.15)", color: GOLD }}>Buyer</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">JPG or PNG · Max 5 MB</p>
              {avatar && (
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => void removeAvatar()}
                  className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto sm:mx-0 disabled:opacity-60"
                >
                  <Trash2 className="w-3 h-3" /> Remove photo
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: GOLD }} /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
                  <div className="h-10 px-3 rounded-lg border border-border bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Country</Label>
                  <div className="h-10 px-3 rounded-lg border border-border bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" /> {user?.country || "—"}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Email and country cannot be changed here. Contact support for account-level changes.</p>
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </BuyerPortalLayout>
  )
}
