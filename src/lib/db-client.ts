import { openDB, type DBSchema, type IDBPDatabase } from "idb"

// ─── Types ───────────────────────────────────────────

export interface Settings {
  id?: string
  monthlySalary: number
  monthlySavings: number
  currency: string
  monthStartDay: number
  largeExpenseAlert: number
}

export interface Category {
  id?: string
  name: string
  icon: string
  color: string
  budgetLimit: number
  isDefault: boolean
  sortOrder: number
}

export interface Expense {
  id?: string
  amount: number
  description: string
  date: string // ISO string
  categoryId?: string
  category?: Category | null
  note?: string | null
  subscriptionId?: string | null
  occurrence?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface SavingsGoal {
  id?: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string | null
  color: string
  createdAt?: string
  updatedAt?: string
}

export interface Income {
  id?: string
  amount: number
  description: string
  date: string // ISO string
  type: "ndf" | "bonus" | "other"
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Subscription {
  id?: string
  name: string
  amount: number
  frequency: "monthly" | "yearly"
  dayOfMonth: number
  categoryId?: string | null
  essential: boolean
  active: boolean
  createdAt?: string
  updatedAt?: string
}

// ─── DB Schema ──────────────────────────────────────

interface MesDepensesDB extends DBSchema {
  settings: {
    key: string
    value: Settings
  }
  categories: {
    key: string
    value: Category
    indexes: { "by-name": string }
  }
  expenses: {
    key: string
    value: Expense
    indexes: { "by-date": string; "by-category": string }
  }
  savingsGoals: {
    key: string
    value: SavingsGoal
  }
  incomes: {
    key: string
    value: Income
    indexes: { "by-date": string }
  }
  subscriptions: {
    key: string
    value: Subscription
    indexes: { "by-active": string }
  }
}

// ─── Default categories ───────────────────────────────

const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Alimentation", icon: "ShoppingCart", color: "#10b981", budgetLimit: 0, isDefault: true, sortOrder: 0 },
  { name: "Transport", icon: "Car", color: "#f59e0b", budgetLimit: 0, isDefault: true, sortOrder: 1 },
  { name: "Logement", icon: "Home", color: "#8b5cf6", budgetLimit: 0, isDefault: true, sortOrder: 2 },
  { name: "Loisirs", icon: "Gamepad2", color: "#ec4899", budgetLimit: 0, isDefault: true, sortOrder: 3 },
  { name: "Santé", icon: "Heart", color: "#06b6d4", budgetLimit: 0, isDefault: true, sortOrder: 4 },
  { name: "Shopping", icon: "Shirt", color: "#f97316", budgetLimit: 0, isDefault: true, sortOrder: 5 },
  { name: "Éducation", icon: "BookOpen", color: "#84cc16", budgetLimit: 0, isDefault: true, sortOrder: 6 },
  { name: "Abonnements", icon: "Smartphone", color: "#14b8a6", budgetLimit: 0, isDefault: true, sortOrder: 7 },
  { name: "Restaurants", icon: "UtensilsCrossed", color: "#eab308", budgetLimit: 0, isDefault: true, sortOrder: 8 },
  { name: "Autre", icon: "CircleDot", color: "#64748b", budgetLimit: 0, isDefault: true, sortOrder: 9 },
]

// ─── UID generator ──────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// ─── DB singleton ───────────────────────────────────

let dbPromise: Promise<IDBPDatabase<MesDepensesDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MesDepensesDB>("mesdepenses-db", 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains("categories")) {
          const catStore = db.createObjectStore("categories", { keyPath: "id" })
          catStore.createIndex("by-name", "name", { unique: true })
        }
        if (!db.objectStoreNames.contains("expenses")) {
          const expStore = db.createObjectStore("expenses", { keyPath: "id" })
          expStore.createIndex("by-date", "date")
          expStore.createIndex("by-category", "categoryId")
        }
        if (!db.objectStoreNames.contains("savingsGoals")) {
          db.createObjectStore("savingsGoals", { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains("incomes")) {
          const incStore = db.createObjectStore("incomes", { keyPath: "id" })
          incStore.createIndex("by-date", "date")
        }
        if (!db.objectStoreNames.contains("subscriptions")) {
          const subStore = db.createObjectStore("subscriptions", { keyPath: "id" })
          subStore.createIndex("by-active", "active")
        }
      },
    })
  }
  return dbPromise
}

// ─── Seed ───────────────────────────────────────────

export async function seedDB(): Promise<{ settings: Settings; categories: Category[] }> {
  const db = await getDB()

  // Seed settings
  let settings = await db.get("settings", "main")
  if (!settings) {
    settings = {
      id: "main",
      monthlySalary: 0,
      monthlySavings: 0,
      currency: "EUR",
      monthStartDay: 1,
      largeExpenseAlert: 50,
    }
    await db.put("settings", settings)
  }

  // Seed categories
  let categories = await db.getAll("categories")
  if (categories.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      const withId = { ...cat, id: uid() }
      await db.put("categories", withId)
    }
    categories = await db.getAll("categories")
  }

  return { settings: settings!, categories }
}

// ─── Settings ───────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  let settings = await db.get("settings", "main")
  if (!settings) {
    settings = { id: "main", monthlySalary: 0, monthlySavings: 0, currency: "EUR", monthStartDay: 1, largeExpenseAlert: 50 }
    await db.put("settings", settings)
  }
  return settings!
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const db = await getDB()
  let settings = await db.get("settings", "main")
  if (!settings) {
    settings = { id: "main", monthlySalary: 0, monthlySavings: 0, currency: "EUR", monthStartDay: 1, largeExpenseAlert: 50 }
  }
  const updated = { ...settings, ...data }
  await db.put("settings", updated)
  return updated
}

// ─── Categories ─────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDB()
  const categories = await db.getAll("categories")
  return categories.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function addCategory(data: Omit<Category, "id">): Promise<Category> {
  const db = await getDB()
  const maxOrder = await db.getAll("categories")
  const category: Category = {
    ...data,
    id: uid(),
    sortOrder: maxOrder.length > 0 ? Math.max(...maxOrder.map((c) => c.sortOrder)) + 1 : 0,
  }
  await db.put("categories", category)
  return category
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const db = await getDB()
  const existing = await db.get("categories", id)
  if (!existing) throw new Error("Catégorie introuvable")
  const updated = { ...existing, ...data }
  await db.put("categories", updated)
  return updated
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  // Also nullify categoryId on expenses
  const tx = db.transaction(["categories", "expenses"], "readwrite")
  await tx.objectStore("categories").delete(id)
  // Update expenses that reference this category
  const expenses = await tx.objectStore("expenses").index("by-category").getAll(id)
  for (const exp of expenses) {
    exp.categoryId = undefined
    exp.category = null
    await tx.objectStore("expenses").put(exp)
  }
  await tx.done
}

// ─── Expenses ────────────────────────────────────────

export async function getExpenses(opts?: {
  month?: string
  categoryId?: string
  search?: string
  minAmount?: number
  maxAmount?: number
  sortBy?: "date" | "amount"
  sortOrder?: "asc" | "desc"
}): Promise<Expense[]> {
  const db = await getDB()
  let expenses = await db.getAll("expenses")

  // Filter by month
  if (opts?.month) {
    const [year, month] = opts.month.split("-").map(Number)
    const startDate = new Date(year, month - 1, 1).getTime()
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()
    expenses = expenses.filter((e) => {
      const t = new Date(e.date).getTime()
      return t >= startDate && t <= endDate
    })
  }

  // Filter by category
  if (opts?.categoryId) {
    expenses = expenses.filter((e) => e.categoryId === opts.categoryId)
  }

  // Search
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    expenses = expenses.filter(
      (e) => e.description.toLowerCase().includes(q) || (e.note?.toLowerCase().includes(q))
    )
  }

  // Amount range
  if (opts?.minAmount !== undefined) {
    expenses = expenses.filter((e) => e.amount >= opts.minAmount!)
  }
  if (opts?.maxAmount !== undefined) {
    expenses = expenses.filter((e) => e.amount <= opts.maxAmount!)
  }

  // Sort
  const sortBy = opts?.sortBy || "date"
  const sortOrder = opts?.sortOrder || "desc"
  expenses.sort((a, b) => {
    const aVal = sortBy === "date" ? new Date(a.date).getTime() : a.amount
    const bVal = sortBy === "date" ? new Date(b.date).getTime() : b.amount
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal
  })

  // Attach category objects
  const categories = await db.getAll("categories")
  const catMap = new Map(categories.map((c) => [c.id, c]))
  for (const e of expenses) {
    e.category = e.categoryId ? catMap.get(e.categoryId) || null : null
  }

  return expenses
}

export async function addExpense(data: {
  amount: number
  description: string
  date: string
  categoryId?: string | null
  note?: string | null
}): Promise<Expense> {
  const db = await getDB()
  const now = new Date().toISOString()
  const expense: Expense = {
    ...data,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }
  await db.put("expenses", expense)

  // Attach category
  if (expense.categoryId) {
    expense.category = await db.get("categories", expense.categoryId) || null
  }

  return expense
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  const db = await getDB()
  const existing = await db.get("expenses", id)
  if (!existing) throw new Error("Dépense introuvable")
  const updated: Expense = { ...existing, ...data, updatedAt: new Date().toISOString() }
  await db.put("expenses", updated)

  if (updated.categoryId) {
    updated.category = await db.get("categories", updated.categoryId) || null
  }

  return updated
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("expenses", id)
}

// ─── Savings Goals ──────────────────────────────────

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const db = await getDB()
  return db.getAll("savingsGoals")
}

export async function addSavingsGoal(data: {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline?: string | null
  color?: string
}): Promise<SavingsGoal> {
  const db = await getDB()
  const now = new Date().toISOString()
  const goal: SavingsGoal = {
    name: data.name,
    targetAmount: data.targetAmount,
    currentAmount: data.currentAmount || 0,
    deadline: data.deadline || null,
    color: data.color || "#10b981",
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }
  await db.put("savingsGoals", goal)
  return goal
}

export async function updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
  const db = await getDB()
  const existing = await db.get("savingsGoals", id)
  if (!existing) throw new Error("Objectif introuvable")
  const updated: SavingsGoal = { ...existing, ...data, updatedAt: new Date().toISOString() }
  await db.put("savingsGoals", updated)
  return updated
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("savingsGoals", id)
}

// ─── Incomes ─────────────────────────────────────────

export async function getIncomes(opts?: {
  month?: string
  sortBy?: "date" | "amount"
  sortOrder?: "asc" | "desc"
}): Promise<Income[]> {
  const db = await getDB()
  let incomes = await db.getAll("incomes")

  if (opts?.month) {
    const [year, month] = opts.month.split("-").map(Number)
    const startDate = new Date(year, month - 1, 1).getTime()
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()
    incomes = incomes.filter((i) => {
      const t = new Date(i.date).getTime()
      return t >= startDate && t <= endDate
    })
  }

  const sortBy = opts?.sortBy || "date"
  const sortOrder = opts?.sortOrder || "desc"
  incomes.sort((a, b) => {
    const aVal = sortBy === "date" ? new Date(a.date).getTime() : a.amount
    const bVal = sortBy === "date" ? new Date(b.date).getTime() : b.amount
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal
  })

  return incomes
}

export async function addIncome(data: {
  amount: number
  description: string
  date: string
  type: "ndf" | "bonus" | "other"
  note?: string | null
}): Promise<Income> {
  const db = await getDB()
  const now = new Date().toISOString()
  const income: Income = {
    ...data,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }
  await db.put("incomes", income)
  return income
}

export async function updateIncome(id: string, data: Partial<Income>): Promise<Income> {
  const db = await getDB()
  const existing = await db.get("incomes", id)
  if (!existing) throw new Error("Revenu introuvable")
  const updated: Income = { ...existing, ...data, updatedAt: new Date().toISOString() }
  await db.put("incomes", updated)
  return updated
}

export async function deleteIncome(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("incomes", id)
}

// ─── Subscriptions ────────────────────────────────

export async function getSubscriptions(): Promise<Subscription[]> {
  const db = await getDB()
  return db.getAll("subscriptions")
}

export async function addSubscription(data: {
  name: string
  amount: number
  frequency: "monthly" | "yearly"
  dayOfMonth: number
  categoryId?: string | null
  essential?: boolean
}): Promise<Subscription> {
  const db = await getDB()
  const now = new Date().toISOString()
  const sub: Subscription = {
    ...data,
    essential: data.essential ?? false,
    active: true,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }
  await db.put("subscriptions", sub)
  return sub
}

export async function updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
  const db = await getDB()
  const existing = await db.get("subscriptions", id)
  if (!existing) throw new Error("Abonnement introuvable")
  const updated: Subscription = { ...existing, ...data, updatedAt: new Date().toISOString() }
  await db.put("subscriptions", updated)
  return updated
}

export async function deleteSubscription(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("subscriptions", id)
}

// Generate pending subscription expenses (call on app init)
export async function generateSubscriptionExpenses(): Promise<Expense[]> {
  const db = await getDB()
  const subscriptions = await db.getAll("subscriptions")
  const allExpenses = await db.getAll("expenses")
  const today = new Date().toISOString().slice(0, 10)
  // Track which (subscriptionId:occurrence) combos already exist
  const done = new Set(
    allExpenses
      .filter((e: any) => e.subscriptionId && e.occurrence)
      .map((e: any) => `${e.subscriptionId}:${e.occurrence}`)
  )
  const created: Expense[] = []
  const tx = db.transaction("expenses", "readwrite")
  for (const sub of subscriptions) {
    if (!sub.active) continue
    const startIso = (sub.createdAt || now).slice(0, 10)
    const occurrences = dueOccurrences(sub, startIso, today)
    for (const occ of occurrences) {
      if (done.has(`${sub.id}:${occ}`)) continue
      const now = new Date().toISOString()
      const expense: Expense = {
        id: uid(),
        amount: sub.amount,
        description: sub.name,
        date: new Date(occ).toISOString(),
        categoryId: sub.categoryId || undefined,
        category: null,
        note: "Prélèvement automatique",
        createdAt: now,
        updatedAt: now,
        subscriptionId: sub.id,
        occurrence: occ,
      }
      await tx.store.put(expense)
      created.push(expense)
    }
  }
  await tx.done()
  return created
}

function dueOccurrences(sub: Subscription, fromIso: string, toIso: string): string[] {
  if (fromIso > toIso) return []
  const [fy, fm] = fromIso.split("-").map(Number)
  const [ty, tm] = toIso.split("-").map(Number)
  const out: string[] = []
  for (let index = fy * 12 + (fm - 1); index <= ty * 12 + (tm - 1); index++) {
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    const day = Math.min(sub.dayOfMonth, daysInMonth)
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    if (date < fromIso || date > toIso) continue
    out.push(date)
  }
  return out
}

// ─── CSV Import ─────────────────────────────────────

export async function importCSV(text: string): Promise<{ imported: number; errors: string[]; total: number }> {
  const db = await getDB()
  const categories = await db.getAll("categories")
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]))

  const lines = text.split("\n").filter((l) => l.trim())
  let imported = 0
  const errors: string[] = []

  const tx = db.transaction("expenses", "readwrite")

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Try semicolon then comma
    let parts = line.split(";").map((p) => p.trim().replace(/^"|"$/g, ""))
    if (parts.length < 3) {
      parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""))
    }
    if (parts.length < 3) {
      errors.push(`Ligne ${i + 1}: format invalide`)
      continue
    }

    const dateStr = parts[0]
    const description = parts[1]
    const amountStr = parts[2].replace(",", ".").replace(/[^\d.\-]/g, "")
    const categoryName = parts[3] || ""

    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      errors.push(`Ligne ${i + 1}: montant invalide "${parts[2]}"`)
      continue
    }

    let date: Date
    const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      date = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
    } else {
      const ymd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (ymd) {
        date = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]))
      } else {
        date = new Date()
      }
    }

    const cat = categoryName ? catMap.get(categoryName.toLowerCase()) : undefined
    const now = new Date().toISOString()

    const expense: Expense = {
      id: uid(),
      amount: Math.abs(amount),
      description,
      date: date.toISOString(),
      categoryId: cat?.id,
      category: cat || null,
      note: null,
      createdAt: now,
      updatedAt: now,
    }
    await tx.store.put(expense)
    imported++
  }

  await tx.done
  return { imported, errors, total: lines.length - 1 }
}

// ─── CSV Export ─────────────────────────────────────

export async function exportCSV(): Promise<string> {
  const expenses = await getExpenses({ sortBy: "date", sortOrder: "desc" })
  const header = "Date;Description;Montant;Catégorie;Note"
  const rows = expenses.map(
    (e) =>
      `${new Date(e.date).toLocaleDateString("fr-FR")};${e.description};${e.amount.toFixed(2)};${e.category?.name || ""};${e.note || ""}`
  )
  return [header, ...rows].join("\n")
}

// ─── Reset data ─────────────────────────────────────

export async function resetData(): Promise<{ settings: Settings; categories: Category[] }> {
  const db = await getDB()
  await db.clear("expenses")
  await db.clear("savingsGoals")
  await db.clear("incomes")
  await db.clear("subscriptions")
  await db.clear("categories")
  await db.clear("settings")
  return seedDB()
}

// ─── Full Backup (JSON) ────────────────────────────

export interface BackupData {
  version: number
  exportedAt: string
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  savingsGoals: SavingsGoal[]
  incomes: Income[]
  subscriptions: Subscription[]
}

export async function exportFullBackup(): Promise<string> {
  const db = await getDB()
  const settings = (await db.get("settings", "main"))!
  const categories = await db.getAll("categories")
  const expenses = await db.getAll("expenses")
  const savingsGoals = await db.getAll("savingsGoals")
  const incomes = await db.getAll("incomes")
  const subscriptions = await db.getAll("subscriptions")

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    expenses,
    savingsGoals,
    incomes,
    subscriptions,
  }

  return JSON.stringify(backup, null, 2)
}

export async function importFullBackup(jsonStr: string): Promise<{
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  savingsGoals: SavingsGoal[]
  incomes: Income[]
  subscriptions: Subscription[]
}> {
  const backup: BackupData = JSON.parse(jsonStr)

  if (!backup.version || !backup.settings || !backup.categories) {
    throw new Error("Fichier de sauvegarde invalide")
  }

  const db = await getDB()

  // Clear everything
  await db.clear("expenses")
  await db.clear("savingsGoals")
  await db.clear("categories")
  await db.clear("settings")
  await db.clear("subscriptions")

  // Restore settings
  await db.put("settings", backup.settings)

  // Restore categories (strip category from expenses to avoid FK issues)
  const expenses: Expense[] = (backup.expenses || []).map((e) => ({
    ...e,
    category: undefined,
  }))
  const categories: Category[] = backup.categories || []

  // Restore savings goals
  const savingsGoals: SavingsGoal[] = backup.savingsGoals || []
  const incomes: Income[] = backup.incomes || []
  const subscriptions: Subscription[] = backup.subscriptions || []

  // Write everything in a transaction
  const tx = db.transaction(["settings", "categories", "expenses", "savingsGoals", "incomes", "subscriptions"], "readwrite")

  await tx.objectStore("settings").put(backup.settings)
  for (const cat of categories) {
    await tx.objectStore("categories").put(cat)
  }
  for (const exp of expenses) {
    await tx.objectStore("expenses").put(exp)
  }
  for (const goal of savingsGoals) {
    await tx.objectStore("savingsGoals").put(goal)
  }
  for (const inc of incomes) {
    await tx.objectStore("incomes").put(inc)
  }
  for (const sub of subscriptions) {
    await tx.objectStore("subscriptions").put(sub)
  }

  await tx.done

  return { settings: backup.settings, categories, expenses, savingsGoals, incomes, subscriptions }
}

// ─── Smart Advice ────────────────────────────────

export type AdviceSeverity = "critical" | "warning" | "info" | "good"

export interface Advice {
  id: string
  severity: AdviceSeverity
  text: string
}

export async function computeAdvice(
  categories: Category[],
  expenses: Expense[],
  incomes: Income[],
  settings: Settings
): Promise<Advice[]> {
  const advice: Advice[] = []
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0) + (settings.monthlySalary || 0)

  // 1. Budget alerts
  for (const cat of categories) {
    if (cat.budgetLimit <= 0) continue
    const spent = expenses.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0)
    const pct = (spent / cat.budgetLimit) * 100
    if (pct >= 100) {
      advice.push({
        id: `over-${cat.id}`,
        severity: "critical",
        text: `Budget « ${cat.name} » dépassé : ${formatEUR(spent)} sur ${formatEUR(cat.budgetLimit)}.`,
      })
    } else if (pct >= 80) {
      advice.push({
        id: `warn-${cat.id}`,
        severity: "warning",
        text: `Budget « ${cat.name} » consommé à ${Math.round(pct)} %. Garde un œil.`,
      })
    }
  }

  // 2. Negative savings
  if (totalIncomes > 0 && totalExpenses > totalIncomes) {
    const diff = totalExpenses - totalIncomes
    advice.push({
      id: "negative-savings",
      severity: "critical",
      text: `Ce mois, tu dépenses plus que tes revenus (${formatEUR(diff)} de plus).`,
    })
  }

  // 3. Good savings
  if (totalIncomes > 0) {
    const rate = Math.round(((totalIncomes - totalExpenses) / totalIncomes) * 100)
    if (rate >= 20) {
      advice.push({
        id: "good-savings",
        severity: "good",
        text: `Beau taux d'épargne : ${rate} % de tes revenus mis de côté ce mois-ci.`,
      })
    }
  }

  // 4. Suggest budget for top unbudgeted category
  const budgeted = new Set(categories.filter((c) => c.budgetLimit > 0).map((c) => c.id))
  const topUnbudgeted = categories
    .filter((c) => !budgeted.has(c.id))
    .map((c) => ({
      cat: c,
      total: expenses.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((x) => x.total >= 50)
    .sort((a, b) => b.total - a.total)[0]
  if (topUnbudgeted) {
    advice.push({
      id: `suggest-${topUnbudgeted.cat.id}`,
      severity: "info",
      text: `« ${topUnbudgeted.cat.name} » représente ${formatEUR(topUnbudgeted.total)} ce mois sans budget défini.`,
    })
  }

  // 5. Large expense alert
  if (settings.largeExpenseAlert > 0) {
    const largeExpenses = expenses.filter((e) => e.amount >= settings.largeExpenseAlert)
    if (largeExpenses.length > 0) {
      advice.push({
        id: "large-expenses",
        severity: "info",
        text: `${largeExpenses.length} dépense${largeExpenses.length > 1 ? "s" : ""} supérieure${largeExpenses.length > 1 ? "s" : ""} à ${formatEUR(settings.largeExpenseAlert)} ce mois.`,
      })
    }
  }

  const order: Record<AdviceSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 }
  return advice.sort((a, b) => order[a.severity] - order[b.severity])
}

function formatEUR(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
}

// ─── Budget Period Utilities ─────────────────────────

export interface BudgetPeriod {
  key: string
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
  label: string
  totalDays: number
  elapsedDays: number
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function effectiveStartDay(year: number, month: number, startDay: number): number {
  const clamped = Math.min(31, Math.max(1, Math.round(startDay) || 1))
  return Math.min(clamped, daysInMonth(year, month))
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function getBudgetPeriod(dateISO: string, startDay: number): BudgetPeriod {
  const d = new Date(dateISO)
  const thisMonthStart = effectiveStartDay(d.getFullYear(), d.getMonth(), startDay)
  const startMonth = d.getDate() >= thisMonthStart ? d.getMonth() : d.getMonth() - 1
  const year = d.getFullYear()
  const adjustedYear = startMonth < 0 ? year - 1 : year
  const adjustedMonth = startMonth < 0 ? 11 : startMonth

  const start = new Date(adjustedYear, adjustedMonth, effectiveStartDay(adjustedYear, adjustedMonth, startDay))
  const nextMonth = adjustedMonth + 1
  const nextYear = nextMonth > 11 ? adjustedYear + 1 : adjustedYear
  const actualNextMonth = nextMonth > 11 ? 0 : nextMonth
  const nextStart = new Date(nextYear, actualNextMonth, effectiveStartDay(nextYear, actualNextMonth, startDay))
  const end = new Date(nextStart.getTime() - 86_400_000)

  const todayStr = toISODate(new Date())
  const msPerDay = 86_400_000
  const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((new Date(todayStr).getTime() - start.getTime()) / msPerDay) + 1))

  const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })
  const label = startDay === 1
    ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(start)
    : `${dayMonthFmt.format(start)} – ${dayMonthFmt.format(end)} ${end.getFullYear()}`

  return {
    key: toISODate(start).slice(0, 7),
    start: toISODate(start),
    end: toISODate(end),
    label,
    totalDays,
    elapsedDays,
  }
}

export function inBudgetPeriod(dateISO: string, period: BudgetPeriod): boolean {
  return dateISO >= period.start && dateISO <= period.end
}

// ─── Payday Detection ────────────────────────────────

export interface PaydaySuggestion {
  day: number
  monthsAnalysed: number
  label: string
  averageAmount: number
  endOfMonth: boolean
}

export async function detectPayday(): Promise<PaydaySuggestion | null> {
  const db = await getDB()
  const allIncomes = await db.getAll("incomes")
  const todayStr = new Date().toISOString().slice(0, 10)
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - 12)
  const cutoff = cutoffDate.toISOString().slice(0, 10)

  // Group largest income per calendar month
  const byMonth = new Map<string, Income>()
  for (const inc of allIncomes) {
    const dateStr = inc.date.slice(0, 10)
    if (dateStr < cutoff || dateStr > todayStr) continue
    const key = dateStr.slice(0, 7)
    const current = byMonth.get(key)
    if (!current || inc.amount > current.amount) byMonth.set(key, inc)
  }

  const picks = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date))
  if (picks.length < 2) return null

  // Check if all fall at month end
  const endOfMonth = picks.every((t) => {
    const day = parseInt(t.date.slice(8, 10))
    const [y, m] = t.date.slice(0, 7).split("-").map(Number)
    return day >= daysInMonth(y, m - 1) - 1
  })

  let day: number
  if (endOfMonth) {
    day = 31
  } else {
    const counts = new Map<number, number>()
    for (const t of picks) {
      const d = parseInt(t.date.slice(8, 10))
      counts.set(d, (counts.get(d) || 0) + 1)
    }
    const mostRecent = parseInt(picks[picks.length - 1].date.slice(8, 10))
    day = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || (a[0] === mostRecent ? -1 : b[0] === mostRecent ? 1 : 0),
    )[0][0]
  }

  const latest = picks[picks.length - 1]
  const label = latest.description.trim() || "votre revenu principal"
  const averageAmount = Math.round(picks.reduce((s, t) => s + t.amount, 0) / picks.length)

  return { day, monthsAnalysed: picks.length, label, averageAmount, endOfMonth }
}

// ─── Period-aware expense/income queries ────────────

export async function getExpensesForPeriod(period: BudgetPeriod): Promise<Expense[]> {
  const db = await getDB()
  const expenses = await db.getAll("expenses")
  const filtered = expenses.filter((e) => inBudgetPeriod(e.date.slice(0, 10), period))
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const categories = await db.getAll("categories")
  const catMap = new Map(categories.map((c) => [c.id, c]))
  for (const e of filtered) {
    e.category = e.categoryId ? catMap.get(e.categoryId) || null : null
  }
  return filtered
}

export async function getIncomesForPeriod(period: BudgetPeriod): Promise<Income[]> {
  const db = await getDB()
  const incomes = await db.getAll("incomes")
  const filtered = incomes.filter((i) => inBudgetPeriod(i.date.slice(0, 10), period))
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return filtered
}
