import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    let settings = await db.settings.findFirst()
    if (!settings) {
      settings = await db.settings.create({
        data: { monthlySalary: 0, monthlySavings: 0, currency: "EUR" },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    let settings = await db.settings.findFirst()
    if (!settings) {
      settings = await db.settings.create({ data: body })
    } else {
      settings = await db.settings.update({ where: { id: settings.id }, data: body })
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings PUT error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
