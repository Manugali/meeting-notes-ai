import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "txt"

  // Get meeting
  const meeting = await retryDbOperation(() =>
    prisma.meeting.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })
  )

  if (!meeting) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Generate export content based on format
  let content: string
  let filename: string
  let contentType: string

  switch (format) {
    case "pdf":
      // For PDF, we'll return JSON and let the client handle PDF generation
      // Or use a library like pdfkit or puppeteer
      return new NextResponse(
        JSON.stringify({ error: "PDF export coming soon. Use TXT or DOCX for now." }),
        { status: 501, headers: { "Content-Type": "application/json" } }
      )

    case "docx":
      // For DOCX, we'll return a simple text format that can be opened in Word
      // In production, use a library like docx
      content = generateDocxContent(meeting)
      filename = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}.docx`
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      // For now, return as text/plain since we don't have docx library
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${filename.replace(".docx", ".txt")}"`,
        },
      })

    case "txt":
    default:
      content = generateTxtContent(meeting)
      filename = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}.txt`
      contentType = "text/plain"
      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
  }
}

function generateTxtContent(meeting: any): string {
  let content = `MEETING NOTES\n`
  content += `=============\n\n`
  content += `Title: ${meeting.title}\n`
  if (meeting.description) {
    content += `Description: ${meeting.description}\n`
  }
  content += `Date: ${new Date(meeting.createdAt).toLocaleString()}\n`
  content += `Status: ${meeting.status}\n\n`

  if (meeting.summary) {
    content += `SUMMARY\n`
    content += `-------\n`
    content += `${meeting.summary}\n\n`
  }

  if (meeting.actionItems && Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0) {
    content += `ACTION ITEMS\n`
    content += `------------\n`
    meeting.actionItems.forEach((item: any, i: number) => {
      content += `${i + 1}. ${item.text || item}`
      if (item.assignee) {
        content += ` (Assigned to: ${item.assignee})`
      }
      if (item.dueDate) {
        content += ` (Due: ${item.dueDate})`
      }
      content += `\n`
    })
    content += `\n`
  }

  if (meeting.keyDecisions && Array.isArray(meeting.keyDecisions) && meeting.keyDecisions.length > 0) {
    content += `KEY DECISIONS\n`
    content += `-------------\n`
    meeting.keyDecisions.forEach((decision: any, i: number) => {
      content += `${i + 1}. ${decision.text || decision}\n`
    })
    content += `\n`
  }

  if (meeting.topics && Array.isArray(meeting.topics) && meeting.topics.length > 0) {
    content += `TOPICS DISCUSSED\n`
    content += `----------------\n`
    meeting.topics.forEach((topic: any, i: number) => {
      content += `${i + 1}. ${topic.name || topic}`
      if (topic.description) {
        content += `: ${topic.description}`
      }
      content += `\n`
    })
    content += `\n`
  }

  if (meeting.transcript) {
    content += `FULL TRANSCRIPT\n`
    content += `---------------\n`
    content += `${meeting.transcript}\n`
  }

  return content
}

function generateDocxContent(meeting: any): string {
  // For now, return the same as TXT
  // In production, use a library like docx to create proper DOCX files
  return generateTxtContent(meeting)
}

