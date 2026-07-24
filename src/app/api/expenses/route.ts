import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const categoryId = searchParams.get("categoryId")
    const search = searchParams.get("search")
    const minAmount = searchParams.get("minAmount")
    const maxAmount = searchParams.get("maxAmount")
    const sortBy = searchParams.get("sortBy") || "date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const where: Record<string, unknown> = {}

    if (month) {
      const [year, m] = month.split("-").map(Number)
      const startDate = new Date(year, m - 1, 1)
      const endDate = new Date(year, m, 0, 23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { note: { contains: search } },
      ]
    }

    if (minAmount) {
      where.amount = { ...(where.amount as Record<string, unknown> || {}), gte: parseFloat(minAmount) }
    }

    if (maxAmount) {
      where.amount = { ...(where.amount as Record<string, unknown> || {}), lte: parseFloat(maxAmount) }
    }

    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    const expenses = await db.expense.findMany({
      where,
      orderBy,
      include: { category: true },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Expenses GET error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const expense = await db.expense.create({
      data: {
        amount: body.amount,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
        categoryId: body.categoryId || null,
        note: body.note || null,
      },
      include: { category: true },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error("Expenses POST error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
