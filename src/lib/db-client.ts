import { openDB, type DBSchema, type IDBPDatabase } from "idb"

// ─── Types ───────────────────────────────────────────

export interface Settings {
  id?: string
  monthlySalary: number
  monthlySavings: number
  currency: string
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
    dbPromise = openDB<MesDepensesDB>("mesdepenses-db", 1, {
      upgrade(db) {
        // Settings store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" })
        }
        // Categories store
        if (!db.objectStoreNames.contains("categories")) {
          const catStore = db.createObjectStore("categories", { keyPath: "id" })
          catStore.createIndex("by-name", "name", { unique: true })
        }
        // Expenses store
        if (!db.objectStoreNames.contains("expenses")) {
          const expStore = db.createObjectStore("expenses", { keyPath: "id" })
          expStore.createIndex("by-date", "date")
          expStore.createIndex("by-category", "categoryId")
        }
        // SavingsGoals store
        if (!db.objectStoreNames.contains("savingsGoals")) {
          db.createObjectStore("savingsGoals", { keyPath: "id" })
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
    settings = { id: "main", monthlySalary: 0, monthlySavings: 0, currency: "EUR" }
    await db.put("settings", settings)
  }
  return settings!
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const db = await getDB()
  let settings = await db.get("settings", "main")
  if (!settings) {
    settings = { id: "main", monthlySalary: 0, monthlySavings: 0, currency: "EUR" }
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
  await db.clear("categories")
  await db.clear("settings")
  return seedDB()
}
