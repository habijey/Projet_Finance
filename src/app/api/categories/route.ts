import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } })
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Categories GET error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const maxOrder = await db.category.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } })
    const category = await db.category.create({
      data: {
        name: body.name,
        icon: body.icon || "CircleDot",
        color: body.color || "#64748b",
        budgetLimit: body.budgetLimit || 0,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    console.error("Categories POST error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
