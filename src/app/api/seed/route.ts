import { db } from "@/lib/db"
import { NextResponse } from "next/server"

const DEFAULT_CATEGORIES = [
  { name: "Alimentation", icon: "ShoppingCart", color: "#10b981", budgetLimit: 0 },
  { name: "Transport", icon: "Car", color: "#f59e0b", budgetLimit: 0 },
  { name: "Logement", icon: "Home", color: "#8b5cf6", budgetLimit: 0 },
  { name: "Loisirs", icon: "Gamepad2", color: "#ec4899", budgetLimit: 0 },
  { name: "Santé", icon: "Heart", color: "#06b6d4", budgetLimit: 0 },
  { name: "Shopping", icon: "Shirt", color: "#f97316", budgetLimit: 0 },
  { name: "Éducation", icon: "BookOpen", color: "#84cc16", budgetLimit: 0 },
  { name: "Abonnements", icon: "Smartphone", color: "#14b8a6", budgetLimit: 0 },
  { name: "Restaurants", icon: "UtensilsCrossed", color: "#eab308", budgetLimit: 0 },
  { name: "Autre", icon: "CircleDot", color: "#64748b", budgetLimit: 0 },
]

export async function GET() {
  try {
    const existingSettings = await db.settings.findFirst()
    if (!existingSettings) {
      await db.settings.create({
        data: { monthlySalary: 0, monthlySavings: 0, currency: "EUR" },
      })
    }

    const existingCategories = await db.category.findMany()
    if (existingCategories.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.category.create({
          data: { ...cat, isDefault: true, sortOrder: DEFAULT_CATEGORIES.indexOf(cat) },
        })
      }
    }

    const settings = await db.settings.findFirst()
    const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } })

    return NextResponse.json({ settings, categories })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Erreur lors de l'initialisation" }, { status: 500 })
  }
}
