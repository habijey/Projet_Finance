import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Expense DELETE error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const expense = await db.expense.update({
      where: { id },
      data: {
        amount: body.amount,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        categoryId: body.categoryId || null,
        note: body.note !== undefined ? body.note : undefined,
      },
      include: { category: true },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error("Expense PUT error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
