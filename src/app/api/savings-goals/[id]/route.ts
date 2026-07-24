import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.savingsGoal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("SavingsGoal DELETE error:", error)
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
    const goal = await db.savingsGoal.update({
      where: { id },
      data: {
        name: body.name,
        targetAmount: body.targetAmount,
        currentAmount: body.currentAmount,
        deadline: body.deadline ? new Date(body.deadline) : null,
        color: body.color,
      },
    })
    return NextResponse.json(goal)
  } catch (error) {
    console.error("SavingsGoal PUT error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
