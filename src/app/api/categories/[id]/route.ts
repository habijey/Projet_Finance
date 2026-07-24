import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Category DELETE error:", error)
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
    const category = await db.category.update({
      where: { id },
      data: {
        name: body.name,
        icon: body.icon,
        color: body.color,
        budgetLimit: body.budgetLimit,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    console.error("Category PUT error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
