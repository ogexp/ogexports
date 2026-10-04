import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  getSiteSettings, saveSiteSettings, getNewsArticles, saveNewsArticles,
  getMediaItems, saveMediaItems, initAdminCmsData,
  type SiteSettings, type NewsArticle, type MediaItem,
} from "@/lib/cms-data"
import {
  Globe, Package, Clock, Users, Ship, Award, Handshake, TrendingUp,
  Plus, Pencil, Trash2, Eye, EyeOff, Image, Video, FileText,
  Linkedin, Twitter, Instagram, MessageCircle, Layout, Save, RefreshCw,
} from "lucide-react"
import { syncGoogleNews, markGoogleSyncDone } from "@/lib/auto-news-fetch"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function genId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Stat Meta ────────────────────────────────────────────────────────────────

const STAT_META = [
  { key: "countries", label: "Countries Served", icon: Globe, color: "#0F3D2E" },
  { key: "commodities", label: "Products Listed", icon: Package, color: "#D4A012" },
  { key: "years", label: "Years of Experience", icon: Clock, color: "#4CAF50" },
  { key: "buyers", label: "Active Buyers", icon: Users, color: "#3b82f6" },
  { key: "shipments", label: "Monthly Shipments", icon: Ship, color: "#8b5cf6" },
  { key: "certifications", label: "Certifications", icon: Award, color: "#f59e0b" },
  { key: "partners", label: "Partner Companies", icon: Handshake, color: "#ef4444" },
  { key: "marketCoverage", label: "Market Coverage (%)", icon: TrendingUp, color: "#06b6d4" },
] as const

// ─── Tab: Homepage ────────────────────────────────────────────────────────────

function HomepageTab({ settings, onChange }: { settings: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const { toast } = useToast()

  function save() {
    saveSiteSettings(settings)
    toast({ title: "Homepage saved", description: "Hero content updated successfully." })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Edit Form */}
      <div className="luxury-card p-6 space-y-5">
        <h3 className="font-heading font-semibold text-foreground text-base flex items-center gap-2">
          <Layout className="w-4 h-4 text-emerald-700" /> Hero Section
        </h3>

        <div className="space-y-1.5">
          <Label>Badge Text</Label>
          <Input value={settings.hero.badge} onChange={e => onChange({ ...settings, hero: { ...settings.hero, badge: e.target.value } })} placeholder="Global Agricultural Trade Leader" />
        </div>
        <div className="space-y-1.5">
          <Label>Main Headline</Label>
          <Input value={settings.hero.headline} onChange={e => onChange({ ...settings, hero: { ...settings.hero, headline: e.target.value } })} placeholder="Connecting the World to Pakistan's Finest Produce" />
        </div>
        <div className="space-y-1.5">
          <Label>Subheadline</Label>
          <Textarea rows={3} value={settings.hero.subheadline} onChange={e => onChange({ ...settings, hero: { ...settings.hero, subheadline: e.target.value } })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Primary CTA Label</Label>
            <Input value={settings.hero.ctaLabel} onChange={e => onChange({ ...settings, hero: { ...settings.hero, ctaLabel: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>Secondary CTA Label</Label>
            <Input value={settings.hero.ctaSecondaryLabel} onChange={e => onChange({ ...settings, hero: { ...settings.hero, ctaSecondaryLabel: e.target.value } })} />
          </div>
        </div>

        <div className="gold-divider my-2" />
        <h3 className="font-heading font-semibold text-foreground text-base">Stats Bar</h3>
        <div className="grid grid-cols-2 gap-4">
          {(["countries", "commodities", "years", "buyers"] as const).map(k => (
            <div key={k} className="space-y-1.5">
              <Label className="capitalize">{STAT_META.find(s => s.key === k)?.label}</Label>
              <Input value={settings.stats[k]} onChange={e => onChange({ ...settings, stats: { ...settings.stats, [k]: e.target.value } })} />
            </div>
          ))}
        </div>

        <Button onClick={save} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white">
          <Save className="w-4 h-4 mr-2" /> Save Homepage Content
        </Button>
      </div>

      {/* Live Preview */}
      <div className="luxury-card p-6">
        <h3 className="font-heading font-semibold text-foreground text-base mb-4">Live Preview</h3>
        <div className="rounded-xl overflow-hidden border border-border" style={{ background: "#0a2a1e" }}>
          <div className="p-6 text-center space-y-3">
            <span className="badge-gold text-[10px]">{settings.hero.badge || "Badge Text"}</span>
            <h2 className="text-white font-heading font-bold text-lg leading-snug mt-2">
              {settings.hero.headline || "Your Headline Here"}
            </h2>
            <p className="text-white/60 text-xs leading-relaxed">
              {settings.hero.subheadline || "Subheadline text here..."}
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#D4A012", color: "#0a2a1e" }}>
                {settings.hero.ctaLabel || "Primary CTA"}
              </span>
              <span className="px-3 py-1.5 rounded-lg border border-white/30 text-xs font-semibold text-white">
                {settings.hero.ctaSecondaryLabel || "Secondary CTA"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 border-t border-white/10">
            {(["countries", "commodities", "years", "buyers"] as const).map(k => (
              <div key={k} className="p-3 text-center border-r border-white/10 last:border-0">
                <div className="text-white font-bold text-sm">{settings.stats[k]}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{STAT_META.find(s => s.key === k)?.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Company ─────────────────────────────────────────────────────────────

function CompanyTab({ settings, onChange }: { settings: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const { toast } = useToast()

  function save() {
    saveSiteSettings(settings)
    toast({ title: "Company content saved", description: "Company information updated successfully." })
  }

  return (
    <div className="luxury-card p-6 space-y-5 max-w-3xl">
      <h3 className="font-heading font-semibold text-foreground text-base">Company Information</h3>

      <div className="space-y-1.5">
        <Label>Company Description</Label>
        <Textarea rows={4} value={settings.company.description}
          onChange={e => onChange({ ...settings, company: { ...settings.company, description: e.target.value } })} />
      </div>
      <div className="space-y-1.5">
        <Label>CEO Message</Label>
        <Textarea rows={4} value={settings.company.ceoMessage}
          onChange={e => onChange({ ...settings, company: { ...settings.company, ceoMessage: e.target.value } })} />
      </div>
      <div className="space-y-1.5">
        <Label>Vision Statement</Label>
        <Textarea rows={3} value={settings.company.vision}
          onChange={e => onChange({ ...settings, company: { ...settings.company, vision: e.target.value } })} />
      </div>
      <div className="space-y-1.5">
        <Label>Mission Statement</Label>
        <Textarea rows={3} value={settings.company.mission}
          onChange={e => onChange({ ...settings, company: { ...settings.company, mission: e.target.value } })} />
      </div>

      <Button onClick={save} className="bg-emerald-800 hover:bg-emerald-900 text-white">
        <Save className="w-4 h-4 mr-2" /> Save Company Content
      </Button>
    </div>
  )
}

// ─── Tab: News & Blog ────────────────────────────────────────────────────────

const CATEGORIES = ["Trade News", "Market Report", "Company Update", "Regulation"]

function emptyArticle(): Omit<NewsArticle, "id"> {
  return {
    title: "", slug: "", category: "Trade News", content: "", excerpt: "",
    imageUrl: "", author: "OG Exports Editorial", publishedAt: new Date().toISOString().slice(0, 10),
    published: false, tags: [],
  }
}

function NewsTab() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<NewsArticle[]>(() => getNewsArticles())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NewsArticle | null>(null)
  const [form, setForm] = useState<Omit<NewsArticle, "id">>(emptyArticle())
  const [tagsInput, setTagsInput] = useState("")
  const [importing, setImporting] = useState(false)

  async function refreshArticles() {
    await initAdminCmsData()
    setArticles(getNewsArticles())
  }

  async function importFromGoogle() {
    setImporting(true)
    try {
      const result = await syncGoogleNews()
      markGoogleSyncDone()
      await refreshArticles()
      toast({
        title: result.imported > 0 ? `Imported ${result.imported} articles` : "No new articles",
        description: result.errors[0] || `Provider: ${result.provider} · skipped ${result.skipped}`,
        variant: result.imported === 0 && result.errors.length ? "destructive" : "default",
      })
    } catch (e: any) {
      toast({ title: "Google import failed", description: e?.message || "Request failed", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  function openNew() {
    setEditing(null)
    const blank = emptyArticle()
    setForm(blank)
    setTagsInput("")
    setDialogOpen(true)
  }

  function openEdit(article: NewsArticle) {
    setEditing(article)
    setForm({ ...article })
    setTagsInput(article.tags.join(", "))
    setDialogOpen(true)
  }

  function saveArticle() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return }
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean)
    const slug = form.slug || slugify(form.title)
    let updated: NewsArticle[]
    if (editing) {
      updated = articles.map(a => a.id === editing.id ? { ...form, tags, slug, id: editing.id } : a)
    } else {
      updated = [{ ...form, tags, slug, id: genId() }, ...articles]
    }
    saveNewsArticles(updated)
    setArticles(updated)
    setDialogOpen(false)
    toast({ title: editing ? "Article updated" : "Article created", description: form.title })
  }

  function deleteArticle(id: string) {
    const updated = articles.filter(a => a.id !== id)
    saveNewsArticles(updated)
    setArticles(updated)
    toast({ title: "Article deleted" })
  }

  function togglePublished(id: string) {
    const updated = articles.map(a => a.id === id ? { ...a, published: !a.published } : a)
    saveNewsArticles(updated)
    setArticles(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-heading font-semibold text-foreground text-base">News & Blog Articles ({articles.length})</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => void importFromGoogle()}
            className="border-emerald-800/30 text-emerald-900"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${importing ? "animate-spin" : ""}`} />
            {importing ? "Importing…" : "Import from Google"}
          </Button>
          <Button onClick={openNew} className="bg-emerald-800 hover:bg-emerald-900 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add New Article
          </Button>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Date</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs">Published</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article.id} className="data-table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{article.title}</div>
                    <div className="text-xs text-muted-foreground">/{article.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-gold text-[10px]">{article.category}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{article.publishedAt}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch checked={article.published} onCheckedChange={() => togglePublished(article.id)} />
                      {article.published
                        ? <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(article)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteArticle(article.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No articles yet. Add your first article.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} placeholder="Article title" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Author</Label>
                <Input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Publish Date</Label>
                <Input type="date" value={form.publishedAt} onChange={e => setForm({ ...form, publishedAt: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Content</Label>
                <Textarea rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full article content..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Image URL</Label>
                <Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="rice, exports, market" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveArticle} className="bg-emerald-800 hover:bg-emerald-900 text-white">
              <Save className="w-4 h-4 mr-2" /> {editing ? "Update Article" : "Create Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab: Statistics ─────────────────────────────────────────────────────────

function StatisticsTab({ settings, onChange }: { settings: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const { toast } = useToast()

  function save() {
    saveSiteSettings(settings)
    toast({ title: "Statistics saved", description: "All stat values updated." })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground text-base">Platform Statistics</h3>
        <Button onClick={save} className="bg-emerald-800 hover:bg-emerald-900 text-white">
          <Save className="w-4 h-4 mr-2" /> Save Statistics
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_META.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="luxury-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">
              {settings.stats[key as keyof typeof settings.stats]}
            </div>
            <Input
              value={settings.stats[key as keyof typeof settings.stats]}
              onChange={e => onChange({ ...settings, stats: { ...settings.stats, [key]: e.target.value } })}
              className="h-8 text-sm"
              placeholder="Enter value..."
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Media Library ───────────────────────────────────────────────────────

function MediaTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<MediaItem[]>(() => getMediaItems())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ url: "", title: "", type: "image" as "image" | "video", tags: "" })

  function addMedia() {
    if (!form.url.trim() || !form.title.trim()) {
      toast({ title: "URL and title required", variant: "destructive" })
      return
    }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean)
    const newItem: MediaItem = {
      id: genId(), url: form.url, title: form.title,
      type: form.type, tags,
      uploadedAt: new Date().toISOString().slice(0, 10),
    }
    const updated = [newItem, ...items]
    saveMediaItems(updated)
    setItems(updated)
    setForm({ url: "", title: "", type: "image", tags: "" })
    setDialogOpen(false)
    toast({ title: "Media added", description: form.title })
  }

  function deleteItem(id: string) {
    const updated = items.filter(i => i.id !== id)
    saveMediaItems(updated)
    setItems(updated)
    toast({ title: "Media deleted" })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground text-base">Media Library ({items.length} items)</h3>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-800 hover:bg-emerald-900 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Media
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="luxury-card overflow-hidden group">
            <div className="relative h-40 bg-muted">
              {item.type === "image" ? (
                <img src={item.url} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x200?text=Image" }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === "image" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {item.type === "image" ? <Image className="w-3 h-3 inline mr-1" /> : <Video className="w-3 h-3 inline mr-1" />}
                  {item.type}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.uploadedAt}</p>
                </div>
                <button onClick={() => deleteItem(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(t => (
                    <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-3 luxury-card p-12 text-center text-muted-foreground">No media items yet.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Media Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as "image" | "video" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="product, hero, team" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={addMedia} className="bg-emerald-800 hover:bg-emerald-900 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Media
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab: Footer & Contact ────────────────────────────────────────────────────

function FooterContactTab({ settings, onChange }: { settings: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const { toast } = useToast()
  const [quickLinksInput, setQuickLinksInput] = useState(settings.footer.quickLinks.join(", "))

  function save() {
    const ql = quickLinksInput.split(",").map(s => s.trim()).filter(Boolean)
    const updated = { ...settings, footer: { ...settings.footer, quickLinks: ql } }
    onChange(updated)
    saveSiteSettings(updated)
    toast({ title: "Contact & Footer saved", description: "All contact information updated." })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Info */}
      <div className="luxury-card p-6 space-y-5">
        <h3 className="font-heading font-semibold text-foreground text-base">Contact Information</h3>
        <div className="space-y-1.5">
          <Label>Street Address</Label>
          <Input value={settings.contact.address}
            onChange={e => onChange({ ...settings, contact: { ...settings.contact, address: e.target.value } })} />
        </div>
        <div className="space-y-1.5">
          <Label>City & Country</Label>
          <Input value={settings.contact.city}
            onChange={e => onChange({ ...settings, contact: { ...settings.contact, city: e.target.value } })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={settings.contact.phone}
              onChange={e => onChange({ ...settings, contact: { ...settings.contact, phone: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={settings.contact.whatsapp}
              onChange={e => onChange({ ...settings, contact: { ...settings.contact, whatsapp: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>General Email</Label>
            <Input type="email" value={settings.contact.email}
              onChange={e => onChange({ ...settings, contact: { ...settings.contact, email: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>Sales Email</Label>
            <Input type="email" value={settings.contact.emailSales}
              onChange={e => onChange({ ...settings, contact: { ...settings.contact, emailSales: e.target.value } })} />
          </div>
        </div>
      </div>

      {/* Social & Footer */}
      <div className="space-y-6">
        <div className="luxury-card p-6 space-y-5">
          <h3 className="font-heading font-semibold text-foreground text-base">Social Media URLs</h3>
          <div className="space-y-3">
            {[
              { key: "linkedin", label: "LinkedIn", icon: Linkedin },
              { key: "twitter", label: "Twitter / X", icon: Twitter },
              { key: "whatsapp", label: "WhatsApp Link", icon: MessageCircle },
              { key: "instagram", label: "Instagram", icon: Instagram },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</Label>
                <Input value={settings.social[key as keyof typeof settings.social]}
                  onChange={e => onChange({ ...settings, social: { ...settings.social, [key]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>

        <div className="luxury-card p-6 space-y-5">
          <h3 className="font-heading font-semibold text-foreground text-base">Footer Content</h3>
          <div className="space-y-1.5">
            <Label>Footer Tagline</Label>
            <Input value={settings.footer.tagline}
              onChange={e => onChange({ ...settings, footer: { ...settings.footer, tagline: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>Copyright Text</Label>
            <Input value={settings.footer.copyright}
              onChange={e => onChange({ ...settings, footer: { ...settings.footer, copyright: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label>Quick Links (comma-separated)</Label>
            <Input value={quickLinksInput} onChange={e => setQuickLinksInput(e.target.value)}
              placeholder="Home, Products, About, Contact" />
            <p className="text-xs text-muted-foreground">Current: {settings.footer.quickLinks.join(" · ")}</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <Button onClick={save} className="bg-emerald-800 hover:bg-emerald-900 text-white">
          <Save className="w-4 h-4 mr-2" /> Save Contact Info
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Registrations ───────────────────────────────────────────────────────

const REG_META = [
  {
    key: "secp",
    label: "SECP Registered",
    authority: "Securities & Exchange Commission of Pakistan",
    placeholder: "e.g. 0112234",
  },
  {
    key: "ntn",
    label: "FBR — National Tax Number (NTN)",
    authority: "Federal Board of Revenue, Pakistan",
    placeholder: "e.g. 2187456-7",
  },
  {
    key: "strn",
    label: "Sales Tax Registration (STRN)",
    authority: "Federal Board of Revenue, Pakistan",
    placeholder: "e.g. 1234567890123",
  },
  {
    key: "psw",
    label: "Pakistan Single Window (PSW)",
    authority: "Pakistan Single Window Authority",
    placeholder: "e.g. PSW-2024-00891",
  },
  {
    key: "weboc",
    label: "WeBOC Registered",
    authority: "Web-Based One Customs — Pakistan Customs",
    placeholder: "e.g. WEB-KHI-20240115",
  },
  {
    key: "chamber",
    label: "Chamber of Commerce & Industry",
    authority: "Karachi Chamber of Commerce & Industry",
    placeholder: "e.g. KCCI-2024-11876",
  },
] as const

function RegistrationsTab({ settings, onChange }: { settings: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const { toast } = useToast()

  const regs: SiteSettings["registrations"] = settings.registrations ?? {
    secp: "", ntn: "", strn: "", psw: "", weboc: "", chamber: "",
  }

  function update(key: keyof SiteSettings["registrations"], val: string) {
    onChange({ ...settings, registrations: { ...regs, [key]: val } })
  }

  function save() {
    saveSiteSettings(settings)
    toast({ title: "Registrations saved", description: "All registration numbers updated on the Company Profile." })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground text-base">Company Registrations & Compliance</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update registration numbers displayed on the public Company Profile page.
          </p>
        </div>
        <Button onClick={save} className="bg-emerald-800 hover:bg-emerald-900 text-white shrink-0">
          <Save className="w-4 h-4 mr-2" /> Save All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REG_META.map(({ key, label, authority, placeholder }) => (
          <div key={key} className="luxury-card p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{authority}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration Number</Label>
              <Input
                value={regs[key]}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder}
                className="font-mono text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-700/40 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <Award className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Changes are reflected immediately on the public Company Profile page after saving. Ensure all numbers are accurate before saving.</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCMS() {
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings())
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let active = true
    initAdminCmsData().finally(() => {
      if (!active) return
      setSettings(getSiteSettings())
      setIsReady(true)
    })
    return () => { active = false }
  }, [])

  // Keep local state in sync across tabs
  function handleChange(updated: SiteSettings) {
    setSettings(updated)
  }

  if (!isReady) {
    return (
      <AdminLayout title="Content Management System" subtitle="Manage all public-facing site content from one place">
        <div className="p-6 text-sm text-muted-foreground">Loading content…</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Content Management System" subtitle="Manage all public-facing site content from one place">
      <div className="p-6 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground font-semibold">CMS</span>
        </div>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Content Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Edit homepage, company info, news articles, media, and more.</p>
          </div>
          <div className="badge-gold">
            <Layout className="w-3 h-3" />
            CMS v1.0
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="homepage">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="homepage" className="text-xs">Homepage</TabsTrigger>
            <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
            <TabsTrigger value="news" className="text-xs">News & Blog</TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs">Statistics</TabsTrigger>
            <TabsTrigger value="media" className="text-xs">Media Library</TabsTrigger>
            <TabsTrigger value="footer" className="text-xs">Footer & Contact</TabsTrigger>
            <TabsTrigger value="registrations" className="text-xs">Registrations</TabsTrigger>
          </TabsList>

          <TabsContent value="homepage" className="mt-6">
            <HomepageTab settings={settings} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <CompanyTab settings={settings} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="news" className="mt-6">
            <NewsTab />
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <StatisticsTab settings={settings} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <MediaTab />
          </TabsContent>

          <TabsContent value="footer" className="mt-6">
            <FooterContactTab settings={settings} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="registrations" className="mt-6">
            <RegistrationsTab settings={settings} onChange={handleChange} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
