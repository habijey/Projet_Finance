import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((l) => l.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "Fichier vide ou invalide" }, { status: 400 })
    }

    const categories = await db.category.findMany()

    const findCategoryByName = (name: string) => {
      if (!name) return null
      return categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    }

    let imported = 0
    let errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(";").map((p) => p.trim().replace(/^"|"$/g, ""))
      if (parts.length < 3) {
        // Try comma separator
        const partsComma = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""))
        if (partsComma.length >= 3) {
          processParts(partsComma)
        } else {
          errors.push(`Ligne ${i + 1}: format invalide`)
        }
      } else {
        processParts(parts)
      }

      function processParts(p: string[]) {
        const dateStr = p[0]
        const description = p[1]
        const amountStr = p[2].replace(",", ".").replace(/[^\d.\-]/g, "")
        const categoryName = p[3] || ""

        const amount = parseFloat(amountStr)
        if (isNaN(amount)) {
          errors.push(`Ligne ${i + 1}: montant invalide "${p[2]}"`)
          return
        }

        let date: Date | null = null
        // Try DD/MM/YYYY
        const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (dmy) {
          date = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
        }
        // Try YYYY-MM-DD
        if (!date) {
          const ymd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
          if (ymd) {
            date = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]))
          }
        }
        if (!date) {
          date = new Date()
        }

        const category = findCategoryByName(categoryName)

        db.expense.create({
          data: {
            amount: Math.abs(amount),
            description,
            date,
            categoryId: category?.id || null,
          },
        }).then(() => {
          imported++
        }).catch(() => {
          errors.push(`Ligne ${i + 1}: erreur d'enregistrement`)
        })
      }
    }

    return NextResponse.json({ imported, errors, total: lines.length - 1 })
  } catch (error) {
    console.error("CSV import error:", error)
    return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 })
  }
}
