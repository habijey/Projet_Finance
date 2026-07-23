import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const goals = await db.savingsGoal.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(goals)
  } catch (error) {
    console.error("SavingsGoals GET error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const goal = await db.savingsGoal.create({
      data: {
        name: body.name,
        targetAmount: body.targetAmount,
        currentAmount: body.currentAmount || 0,
        deadline: body.deadline ? new Date(body.deadline) : null,
        color: body.color || "#10b981",
      },
    })
    return NextResponse.json(goal)
  } catch (error) {
    console.error("SavingsGoals POST error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
