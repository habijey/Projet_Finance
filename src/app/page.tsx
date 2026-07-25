"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useAppStore, type TabId } from "@/lib/store"
import { useIsMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Charts
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

// Lucide icons
import {
  LayoutDashboard,
  PlusCircle,
  History,
  PiggyBank,
  Settings,
  Upload,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Calendar,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpDown,
  Moon,
  Sun,
  Download,
  RotateCcw,
  FolderDown,
} from "lucide-react"

// ─── IndexedDB client ───────────────────────────────────
import {
  seedDB,
  getSettings as dbGetSettings,
  updateSettings as dbUpdateSettings,
  getCategories as dbGetCategories,
  addCategory as dbAddCategory,
  deleteCategory as dbDeleteCategory,
  getExpenses as dbGetExpenses,
  addExpense as dbAddExpense,
  updateExpense as dbUpdateExpense,
  deleteExpense as dbDeleteExpense,
  getSavingsGoals as dbGetSavingsGoals,
  addSavingsGoal as dbAddSavingsGoal,
  updateSavingsGoal as dbUpdateSavingsGoal,
  deleteSavingsGoal as dbDeleteSavingsGoal,
  importCSV as dbImportCSV,
  exportCSV as dbExportCSV,
  exportFullBackup as dbExportFullBackup,
  importFullBackup as dbImportFullBackup,
  resetData as dbResetData,
  getIncomes as dbGetIncomes,
  addIncome as dbAddIncome,
  updateIncome as dbUpdateIncome,
  deleteIncome as dbDeleteIncome,
  type Income as DBIncome,
  type Settings as DBSettings,
  type Category as DBCategory,
  type Expense as DBExpense,
  type SavingsGoal as DBSavingsGoal,
} from "@/lib/db-client"

// Local type aliases for convenience
type Settings = DBSettings
type Category = DBCategory
type Expense = DBExpense
type SavingsGoal = DBSavingsGoal
type Income = DBIncome

// ─── Helpers ─────────────────────────────────────────────

function formatMoney(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d))
}

function formatDateShort(d: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(d))
}

function getCurrentMonthStr(): string {
  return new Date().toISOString().slice(0, 7)
}

const PIE_COLORS = [
  "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#f97316", "#84cc16", "#14b8a6",
  "#eab308", "#64748b", "#e11d48", "#7c3aed",
]

// ─── Main Component ──────────────────────────────────────

export default function Home() {
  const { activeTab, setActiveTab, filters, setFilters } = useAppStore()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()

  // Data states
  const [settings, setSettings] = useState<Settings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [allMonthExpenses, setAllMonthExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [allMonthIncomes, setAllMonthIncomes] = useState<Income[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted] = useState(true)

  // ─── Load all data from IndexedDB on first load ───
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const { settings: s, categories: c } = await seedDB()
        if (cancelled) return
        setSettings(s)
        setCategories(c)
        const goals = await dbGetSavingsGoals()
        if (cancelled) return
        setSavingsGoals(goals)
        const monthExpenses = await dbGetExpenses({ month: getCurrentMonthStr(), sortBy: "date", sortOrder: "desc" })
        if (cancelled) return
        setAllMonthExpenses(monthExpenses)
        const monthIncomes = await dbGetIncomes({ month: getCurrentMonthStr(), sortBy: "date", sortOrder: "desc" })
        if (cancelled) return
        setAllMonthIncomes(monthIncomes)
      } catch (e) {
        console.error("Init error", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // ─── Refresh filtered expenses (history tab) ──────
  useEffect(() => {
    if (activeTab !== "history") return
    let cancelled = false
    dbGetExpenses({
      month: filters.month,
      categoryId: filters.categoryId || undefined,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }).then((data) => { if (!cancelled) setExpenses(data) }).catch(console.error)
    return () => { cancelled = true }
  }, [activeTab, filters])

  // ─── Derived stats ────────────────────────────────
  const totalMonthExpenses = allMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalMonthIncomes = allMonthIncomes.reduce((s, i) => s + i.amount, 0)
  const remaining = (settings?.monthlySalary || 0) + totalMonthIncomes - (settings?.monthlySavings || 0) - totalMonthExpenses

  // Budget alerts
  const budgetAlerts = categories
    .filter((c) => c.budgetLimit > 0)
    .map((c) => {
      const spent = allMonthExpenses
        .filter((e) => e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0)
      const pct = (spent / c.budgetLimit) * 100
      return { ...c, spent, pct }
    })
    .filter((c) => c.pct >= 80)
    .sort((a, b) => b.pct - a.pct)

  // Category breakdown for chart
  const categoryBreakdown = categories
    .map((c) => {
      const total = allMonthExpenses
        .filter((e) => e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0)
      return total > 0 ? { name: c.name, value: total, color: c.color } : null
    })
    .filter(Boolean) as { name: string; value: number; color: string }[]

  // ─── Actions ──────────────────────────────────────
  const addExpense = async (data: {
    amount: number
    description: string
    date: string
    categoryId: string | null
    note: string | null
  }) => {
    const expense = await dbAddExpense(data)
    setAllMonthExpenses((prev) => [expense, ...prev])
    if (activeTab === "history") {
      setExpenses((prev) => [expense, ...prev])
    }
    toast.success(`Dépense de ${formatMoney(data.amount)} ajoutée`)
  }

  const deleteExpense = async (id: string) => {
    await dbDeleteExpense(id)
    setAllMonthExpenses((prev) => prev.filter((e) => e.id !== id))
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success("Dépense supprimée")
  }

  const addIncomeAction = async (data: {
    amount: number
    description: string
    date: string
    type: "ndf" | "bonus" | "other"
    note: string | null
  }) => {
    const income = await dbAddIncome(data)
    setAllMonthIncomes((prev) => [income, ...prev])
    toast.success(`Revenu de ${formatMoney(data.amount)} ajouté`)
  }

  const deleteIncomeAction = async (id: string) => {
    await dbDeleteIncome(id)
    setAllMonthIncomes((prev) => prev.filter((i) => i.id !== id))
    toast.success("Revenu supprimé")
  }

  const updateSettings = async (data: Partial<DBSettings>) => {
    const s = await dbUpdateSettings(data)
    setSettings(s)
    toast.success("Paramètres mis à jour")
  }

  const addCategory = async (data: { name: string; icon: string; color: string; budgetLimit: number }) => {
    const cat = await dbAddCategory(data)
    setCategories((prev) => [...prev, cat])
    toast.success(`Catégorie "${cat.name}" créée`)
  }

  const deleteCategory = async (id: string) => {
    await dbDeleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    toast.success("Catégorie supprimée")
  }

  const addSavingsGoal = async (data: {
    name: string
    targetAmount: number
    currentAmount: number
    deadline: string | null
    color: string
  }) => {
    const goal = await dbAddSavingsGoal(data)
    setSavingsGoals((prev) => [goal, ...prev])
    toast.success(`Objectif "${goal.name}" créé`)
  }

  const updateSavingsGoal = async (id: string, data: Partial<DBSavingsGoal>) => {
    const goal = await dbUpdateSavingsGoal(id, data)
    setSavingsGoals((prev) => prev.map((g) => (g.id === id ? goal : g)))
    toast.success("Objectif mis à jour")
  }

  const deleteSavingsGoal = async (id: string) => {
    await dbDeleteSavingsGoal(id)
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id))
    toast.success("Objectif supprimé")
  }

  const addFundsToGoal = async (id: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === id)
    if (!goal) return
    await updateSavingsGoal(id, { currentAmount: goal.currentAmount + amount })
  }

  const handleCSVImport = async (file: File) => {
    const text = await file.text()
    const result = await dbImportCSV(text)
    if (result.imported > 0) {
      toast.success(`${result.imported} dépenses importées`)
      // Refresh expenses from IndexedDB
      const monthExps = await dbGetExpenses({ month: getCurrentMonthStr(), sortBy: "date", sortOrder: "desc" })
      setAllMonthExpenses(monthExps)
      if (activeTab === "history") {
        const fExps = await dbGetExpenses({ month: filters.month, sortBy: filters.sortBy, sortOrder: filters.sortOrder })
        setExpenses(fExps)
      }
    }
    if (result.errors?.length > 0) {
      toast.warning(`${result.errors.length} erreurs lors de l'import`)
    }
  }

  // ─── Tab definitions ──────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Tableau", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "add", label: "Ajouter", icon: <PlusCircle className="h-5 w-5" /> },
    { id: "history", label: "Historique", icon: <History className="h-5 w-5" /> },
    { id: "savings", label: "Épargne", icon: <PiggyBank className="h-5 w-5" /> },
    { id: "settings", label: "Paramètres", icon: <Settings className="h-5 w-5" /> },
  ]

  // ─── Render views ────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Voici le résumé de vos finances ce mois-ci
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Salaire</span>
            </div>
            <p className="text-xl font-bold">{formatMoney(settings?.monthlySalary || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Revenus</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalMonthIncomes)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Épargne</span>
            </div>
            <p className="text-xl font-bold">{formatMoney(settings?.monthlySavings || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground font-medium">Dépenses</span>
            </div>
            <p className="text-xl font-bold">{formatMoney(totalMonthExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${remaining >= 0 ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" : "from-rose-500/10 to-rose-500/5 border-rose-500/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {remaining >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              )}
              <span className="text-xs text-muted-foreground font-medium">Restant</span>
            </div>
            <p className={`text-xl font-bold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatMoney(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {budgetAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alert.color }} />
                  <span>{alert.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(alert.pct, 100)} className="w-20 h-2" />
                  <span className={alert.pct >= 100 ? "text-rose-500 font-semibold" : "text-amber-600"}>
                    {alert.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune dépense ce mois-ci
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top catégories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown.slice(0, 6).sort((a, b) => b.value - a.value)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${v}€`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {categoryBreakdown.slice(0, 6).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée à afficher
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Dernières dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          {allMonthExpenses.length > 0 ? (
            <div className="space-y-3">
              {allMonthExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: expense.category?.color || "#64748b" }}
                    >
                      {expense.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category?.name || "Non catégorisé"} · {formatDateShort(expense.date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-rose-500">-{formatMoney(expense.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune dépense enregistrée ce mois-ci
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Incomes */}
      {allMonthIncomes.length > 0 && (
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Derniers revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allMonthIncomes.slice(0, 5).map((income) => (
                <div key={income.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0 bg-emerald-500">
                      {income.type === "ndf" ? "N" : income.type === "bonus" ? "B" : "+"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{income.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {income.type === "ndf" ? "Note de frais" : income.type === "bonus" ? "Bonus / Prime" : "Autre"} · {formatDateShort(income.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-emerald-500">+{formatMoney(income.amount)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600"
                      onClick={() => deleteIncomeAction(income.id!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ─── Add Expense View ───────────────────────────────
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    categoryId: "",
    note: "",
  })

  const [newIncome, setNewIncome] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    type: "ndf" as "ndf" | "bonus" | "other",
    note: "",
  })

  const renderAddExpense = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajouter une dépense</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Saisissez manuellement ou importez un fichier CSV
        </p>
      </div>

      {/* Manual Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Saisie manuelle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="text-2xl font-bold h-14 text-center"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Ex: Courses Carrefour"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={newExpense.categoryId}
                onValueChange={(v) => setNewExpense({ ...newExpense, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea
              id="note"
              placeholder="Détails supplémentaires..."
              value={newExpense.note}
              onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
              rows={2}
            />
          </div>
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={() => {
              if (!newExpense.amount || !newExpense.description) {
                toast.error("Montant et description requis")
                return
              }
              addExpense({
                amount: parseFloat(newExpense.amount),
                description: newExpense.description,
                date: newExpense.date,
                categoryId: newExpense.categoryId || null,
                note: newExpense.note || null,
              })
              setNewExpense({
                amount: "",
                description: "",
                date: new Date().toISOString().slice(0, 10),
                categoryId: "",
                note: "",
              })
            }}
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Ajouter la dépense
          </Button>
        </CardContent>
      </Card>

      {/* Add Income */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Ajouter un revenu (NDF, bonus...)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Montant (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={newIncome.amount}
              onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
              className="text-2xl font-bold h-14 text-center text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Ex: NDF déplacement, Bonus..."
              value={newIncome.description}
              onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newIncome.type}
                onValueChange={(v) => setNewIncome({ ...newIncome, type: v as "ndf" | "bonus" | "other" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ndf">Note de frais</SelectItem>
                  <SelectItem value="bonus">Bonus / Prime</SelectItem>
                  <SelectItem value="other">Autre revenu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newIncome.date}
                onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea
              placeholder="Détails..."
              value={newIncome.note}
              onChange={(e) => setNewIncome({ ...newIncome, note: e.target.value })}
              rows={2}
            />
          </div>
          <Button
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              if (!newIncome.amount || !newIncome.description) {
                toast.error("Montant et description requis")
                return
              }
              addIncomeAction({
                amount: parseFloat(newIncome.amount),
                description: newIncome.description,
                date: newIncome.date,
                type: newIncome.type,
                note: newIncome.note || null,
              })
              setNewIncome({
                amount: "",
                description: "",
                date: new Date().toISOString().slice(0, 10),
                type: "ndf",
                note: "",
              })
            }}
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Ajouter le revenu
          </Button>
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import CSV bancaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <FolderDown className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Glissez votre fichier CSV ici</p>
            <p className="text-xs text-muted-foreground mb-4">
              Colonnes attendues : Date; Description; Montant; Catégorie (optionnel)
            </p>
            <label>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCSVImport(file)
                }}
              />
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Parcourir les fichiers
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ─── History View ─────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    date: "",
    categoryId: "",
    note: "",
  })

  const filteredTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const filteredAvg = expenses.length > 0 ? filteredTotal / expenses.length : 0

  const renderHistory = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Consultez et filtrez toutes vos dépenses
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Mois</Label>
              <Input
                type="month"
                value={filters.month}
                onChange={(e) => setFilters({ month: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Catégorie</Label>
              <Select
                value={filters.categoryId || "all"}
                onValueChange={(v) =>
                  setFilters({ categoryId: v === "all" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Description..."
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  sortBy: filters.sortBy === "date" ? "amount" : "date",
                })
              }
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              {filters.sortBy === "date" ? "Trier par montant" : "Trier par date"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
                })
              }
            >
              {filters.sortOrder === "desc" ? (
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
              )}
              {filters.sortOrder === "desc" ? "Récent" : "Ancien"}
            </Button>
            {(filters.categoryId || filters.search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ categoryId: null, search: "" })}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-rose-500">{formatMoney(filteredTotal)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Moyenne</p>
          <p className="text-lg font-bold">{formatMoney(filteredAvg)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Nb dépenses</p>
          <p className="text-lg font-bold">{expenses.length}</p>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardContent className="p-0">
          {expenses.length > 0 ? (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{
                          backgroundColor: expense.category?.color || "#64748b",
                        }}
                      >
                        {expense.description.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.category?.name || "Non catégorisé"} · {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-semibold text-rose-500 min-w-[70px] text-right">
                        -{formatMoney(expense.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditExpense(expense)
                          setEditForm({
                            amount: String(expense.amount),
                            description: expense.description,
                            date: expense.date.slice(0, 10),
                            categoryId: expense.categoryId || "",
                            note: expense.note || "",
                          })
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Aucune dépense trouvée pour ces filtres
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (deleteId) deleteExpense(deleteId)
                setDeleteId(null)
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editExpense} onOpenChange={() => setEditExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
            <DialogDescription>Modifiez les détails de votre dépense.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm({ ...editForm, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={editForm.categoryId}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, categoryId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExpense(null)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!editExpense) return
                const updated = await dbUpdateExpense(editExpense.id, {
                  amount: parseFloat(editForm.amount),
                  description: editForm.description,
                  date: editForm.date,
                  categoryId: editForm.categoryId || null,
                  note: editForm.note || null,
                })
                setAllMonthExpenses((prev) =>
                  prev.map((e) => (e.id === updated.id ? updated : e))
                )
                setExpenses((prev) =>
                  prev.map((e) => (e.id === updated.id ? updated : e))
                )
                setEditExpense(null)
                toast.success("Dépense modifiée")
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // ─── Savings Goals View ──────────────────────────
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    color: "#10b981",
  })
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [addFundsGoalId, setAddFundsGoalId] = useState<string | null>(null)
  const [addFundsAmount, setAddFundsAmount] = useState("")
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0)

  const renderSavings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Objectifs d'épargne</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivez vos objectifs d'épargne
          </p>
        </div>
        <Button size="sm" onClick={() => setShowGoalForm(true)}>
          <PlusCircle className="h-4 w-4 mr-1" />
          Nouveau
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-muted-foreground mb-1">Total épargné</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalSaved)}</p>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">Objectif total</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(totalTarget)}</p>
        </Card>
      </div>

      {/* Goal Cards */}
      {savingsGoals.length > 0 ? (
        <div className="space-y-4">
          {savingsGoals.map((goal) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            const remaining = goal.targetAmount - goal.currentAmount
            return (
              <Card key={goal.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: goal.color }} />
                      <h3 className="font-semibold">{goal.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAddFundsGoalId(goal.id)}
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => setDeleteGoalId(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{formatMoney(goal.currentAmount)}</span>
                      <span className="font-medium">{formatMoney(goal.targetAmount)}</span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-3" />
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">{pct.toFixed(1)}% atteint</span>
                      <span className="text-muted-foreground">Reste: {formatMoney(Math.max(0, remaining))}</span>
                    </div>
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Échéance: {formatDate(goal.deadline)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <PiggyBank className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            Créez votre premier objectif d'épargne pour commencer
          </p>
        </Card>
      )}

      {/* New Goal Form */}
      <Dialog open={showGoalForm} onOpenChange={setShowGoalForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel objectif d'épargne</DialogTitle>
            <DialogDescription>Définissez un objectif à atteindre.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                placeholder="Ex: Vacances d'été"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant cible (€)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newGoal.targetAmount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, targetAmount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Déjà épargné (€)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newGoal.currentAmount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, currentAmount: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date limite (optionnel)</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, deadline: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#e11d48"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newGoal.color === c
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewGoal({ ...newGoal, color: c })}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalForm(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!newGoal.name || !newGoal.targetAmount) {
                  toast.error("Nom et montant cible requis")
                  return
                }
                addSavingsGoal({
                  name: newGoal.name,
                  targetAmount: parseFloat(newGoal.targetAmount),
                  currentAmount: parseFloat(newGoal.currentAmount) || 0,
                  deadline: newGoal.deadline || null,
                  color: newGoal.color,
                })
                setNewGoal({ name: "", targetAmount: "", currentAmount: "0", deadline: "", color: "#10b981" })
                setShowGoalForm(false)
              }}
            >
              Créer l'objectif
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={!!addFundsGoalId} onOpenChange={() => setAddFundsGoalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des fonds</DialogTitle>
            <DialogDescription>Combien souhaitez-vous ajouter ?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                className="text-2xl font-bold h-14 text-center"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFundsGoalId(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!addFundsGoalId || !addFundsAmount) return
                addFundsToGoal(addFundsGoalId, parseFloat(addFundsAmount))
                setAddFundsAmount("")
                setAddFundsGoalId(null)
              }}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Goal */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'épargne enregistrée sera perdue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (deleteGoalId) deleteSavingsGoal(deleteGoalId)
                setDeleteGoalId(null)
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  // ─── Settings View ────────────────────────────────
  const [settingsForm, setSettingsForm] = useState({
    monthlySalary: "0",
    monthlySavings: "0",
  })
  const [newCat, setNewCat] = useState({ name: "", color: "#64748b" })

  // Sync settings form when settings data changes
  const [settingsInitialized, setSettingsInitialized] = useState(false)
  useEffect(() => {
    if (!settings || settingsInitialized) return
    queueMicrotask(() => {
      setSettingsForm({
        monthlySalary: String(settings.monthlySalary),
        monthlySavings: String(settings.monthlySavings),
      })
      setSettingsInitialized(true)
    })
  }, [settings, settingsInitialized])

  const handleExport = async () => {
    const csv = await dbExportCSV()
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `depenses_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export terminé")
  }

  const handleFullBackup = async () => {
    const json = await dbExportFullBackup()
    const blob = new Blob([json], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `mesdepenses_backup_${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Sauvegarde complète téléchargée")
  }

  const handleFullRestore = async (file: File) => {
    try {
      const json = await file.text()
      const data = await dbImportFullBackup(json)
      // Update all state
      setSettings(data.settings)
      setCategories(data.categories)
      setSavingsGoals(data.savingsGoals)
      // Rebuild expenses with categories attached
      const catMap = new Map(data.categories.map((c) => [c.id, c]))
      const expsWithCat = data.expenses.map((e) => ({
        ...e,
        category: e.categoryId ? catMap.get(e.categoryId) || null : null,
      }))
      setAllMonthExpenses(expsWithCat.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setExpenses(expsWithCat)
      // Restore incomes
      const monthIncs = (data.incomes || []).filter((i) => {
        const [year, month] = getCurrentMonthStr().split("-").map(Number)
        const startDate = new Date(year, month - 1, 1).getTime()
        const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()
        const t = new Date(i.date).getTime()
        return t >= startDate && t <= endDate
      })
      setAllMonthIncomes(monthIncs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      toast.success(`Restauré : ${data.expenses.length} dépenses, ${data.savingsGoals.length} objectifs, ${data.incomes.length} revenus`)
    } catch (e) {
      toast.error("Erreur lors de la restauration : fichier invalide")
    }
  }

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configurez votre profil financier et vos préférences
        </p>
      </div>

      {/* Financial Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Profil financier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Salaire mensuel (€)</Label>
            <Input
              type="number"
              value={settingsForm.monthlySalary}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, monthlySalary: e.target.value })
              }
              placeholder="2000"
            />
          </div>
          <div className="space-y-2">
            <Label>Épargne mensuelle cible (€)</Label>
            <Input
              type="number"
              value={settingsForm.monthlySavings}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, monthlySavings: e.target.value })
              }
              placeholder="200"
            />
          </div>
          <Button
            onClick={() =>
              updateSettings({
                monthlySalary: parseFloat(settingsForm.monthlySalary) || 0,
                monthlySavings: parseFloat(settingsForm.monthlySavings) || 0,
              })
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {mounted && theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Mode sombre</p>
              <p className="text-xs text-muted-foreground">
                Basculez entre le thème clair et sombre
              </p>
            </div>
            <Switch
              checked={mounted && theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Gestion des catégories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    {cat.budgetLimit > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Budget: {formatMoney(cat.budgetLimit)}/mois
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600"
                  onClick={() => deleteCategory(cat.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Ajouter une catégorie</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la catégorie"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                className="flex-1"
              />
              <div className="flex gap-1">
                {["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newCat.color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewCat({ ...newCat, color: c })}
                    />
                  )
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!newCat.name) {
                  toast.error("Nom de catégorie requis")
                  return
                }
                addCategory({ name: newCat.name, icon: "CircleDot", color: newCat.color, budgetLimit: 0 })
                setNewCat({ name: "", color: "#64748b" })
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync between devices */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
            <Upload className="h-4 w-4 text-primary shrink-0" />
            <span className="text-primary font-semibold">Synchroniser entre appareils</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Exportez toutes vos données sur un appareil, puis importez-les sur l'autre (iPhone ↔ PC).
          </p>
          <Button className="w-full" onClick={handleFullBackup}>
            <Download className="h-4 w-4 mr-2 shrink-0" />
            <span className="whitespace-normal text-left">Sauvegarder toutes mes données (JSON)</span>
          </Button>
          <label className="block w-full">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFullRestore(file)
                e.target.value = ""
              }}
            />
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span className="flex items-center">
                <Upload className="h-4 w-4 mr-2 shrink-0" />
                <span className="whitespace-normal">Restaurer depuis un fichier (JSON)</span>
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            Données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter toutes les dépenses (CSV)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={async () => {
              const { settings: s, categories: c } = await dbResetData()
              setSettings(s)
              setCategories(c)
              setSavingsGoals([])
              setAllMonthExpenses([])
              setAllMonthIncomes([])
              setExpenses([])
              toast.success("Données par défaut réinitialisées")
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser les données par défaut
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // ─── Loading State ────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // ─── Main Layout ───────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard()
      case "add":
        return renderAddExpense()
      case "history":
        return renderHistory()
      case "savings":
        return renderSavings()
      case "settings":
        return renderSettings()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r bg-card/50 backdrop-blur-sm z-40">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">MesDépenses</h2>
                <p className="text-xs text-muted-foreground">Suivi de budget</p>
              </div>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {/* Quick Stats in Sidebar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Revenus du mois</span>
                <span className="text-emerald-500 font-semibold">
                  {formatMoney(totalMonthIncomes)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Solde restant</span>
                <span className={remaining >= 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                  {formatMoney(remaining)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${isMobile ? "" : "ml-64"}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t z-40 safe-area-inset-bottom">
          <div className="flex items-center justify-around py-1 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px] ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div className={activeTab === tab.id ? "scale-110" : ""}>
                  {tab.icon}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Mobile FAB */}
      {isMobile && activeTab !== "add" && (
        <button
          onClick={() => setActiveTab("add")}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-transform"
        >
          <PlusCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
