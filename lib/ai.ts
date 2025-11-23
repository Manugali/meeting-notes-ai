import OpenAI from "openai"
import { prisma } from "./db"
import { retryDbOperation } from "./db-utils"
import { retryOpenAICall } from "./openai-retry"

// Lazy initialization - only create client when needed (at runtime, not build time)
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function processMeeting(meetingId: string) {
  try {
    // Get meeting from database
    const meeting = await retryDbOperation(() =>
      prisma.meeting.findUnique({
        where: { id: meetingId },
      })
    )

    if (!meeting || !meeting.recordingUrl) {
      throw new Error("Meeting or recording URL not found")
    }

    // Update status to processing
    await retryDbOperation(() =>
      prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "processing" },
      })
    )

    // Step 1: Transcribe audio/video
    console.log(`Transcribing meeting ${meetingId}...`)
    const transcription = await transcribeAudio(meeting.recordingUrl)

    // Step 2: Generate summary and extract insights
    console.log(`Analyzing meeting ${meetingId}...`)
    const analysis = await analyzeTranscript(transcription, meeting.title)

    // Step 3: Update meeting with results (with retry after long processing)
    await retryDbOperation(() =>
      prisma.meeting.update({
        where: { id: meetingId },
        data: {
          transcript: transcription,
          summary: analysis.summary,
          actionItems: analysis.actionItems,
          keyDecisions: analysis.keyDecisions,
          topics: analysis.topics,
          status: "completed",
          processedAt: new Date(),
          duration: analysis.duration,
        },
      })
    )

    console.log(`Meeting ${meetingId} processed successfully`)
    return { success: true }
  } catch (error: any) {
    console.error(`Error processing meeting ${meetingId}:`, error)
    
    // Update status to failed (only if meeting still exists)
    try {
      // First check if meeting exists
      const existingMeeting = await retryDbOperation(() =>
        prisma.meeting.findUnique({
          where: { id: meetingId },
          select: { id: true },
        })
      )

      if (existingMeeting) {
        await retryDbOperation(() =>
          prisma.meeting.update({
            where: { id: meetingId },
            data: { status: "failed" },
          })
        )
      } else {
        console.warn(`Meeting ${meetingId} no longer exists, skipping status update`)
      }
    } catch (updateError: any) {
      // Don't fail if meeting doesn't exist (P2025) or other update errors
      if (updateError.code !== "P2025") {
        console.error(`Failed to update meeting status to failed:`, updateError)
      }
    }

    throw error
  }
}

async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    // Download the audio file from Vercel Blob
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`)
    }

    // Check file size before downloading
    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      const fileSizeMB = parseInt(contentLength) / (1024 * 1024)
      if (fileSizeMB > 25) {
        throw new Error(
          `File size (${fileSizeMB.toFixed(1)}MB) exceeds OpenAI's 25MB limit. Please compress or split your file.`
        )
      }
    }

    // Convert response to buffer for Node.js
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check buffer size
    const bufferSizeMB = buffer.length / (1024 * 1024)
    if (bufferSizeMB > 25) {
      throw new Error(
        `File size (${bufferSizeMB.toFixed(1)}MB) exceeds OpenAI's 25MB limit. Please compress or split your file.`
      )
    }

    // Create a File object (Node.js 18+ supports File)
    const audioFile = new File([buffer], "audio.mp4", { 
      type: response.headers.get("content-type") || "audio/mpeg" 
    })

    // Transcribe using OpenAI Whisper with retry logic
    const transcription = await retryOpenAICall(
      () => getOpenAIClient().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // You can make this dynamic based on user preference
      }),
      3, // 3 retries
      2000 // 2 second base delay
    )

    return transcription.text
  } catch (error: any) {
    console.error("Transcription error:", error)
    
    // Provide helpful error messages
    if (error.status === 413 || error.message?.includes("25MB") || error.message?.includes("26214400")) {
      throw new Error(
        "File too large. OpenAI Whisper API has a 25MB limit. Please compress your audio/video file or split it into smaller segments."
      )
    }
    
    // Handle OpenAI API errors
    if (error.status === 502 || error.status === 503) {
      throw new Error(
        "OpenAI service is temporarily unavailable. Please try again in a few minutes."
      )
    }
    
    if (error.status === 429) {
      throw new Error(
        "OpenAI API rate limit exceeded. Please try again in a few minutes."
      )
    }
    
    // Extract error message from HTML response if present
    let errorMessage = error.message || "Unknown error"
    if (errorMessage.includes("<!DOCTYPE html>") || errorMessage.includes("Bad gateway")) {
      errorMessage = "OpenAI service is temporarily unavailable. Please try again later."
    }
    
    throw new Error(`Transcription failed: ${errorMessage}`)
  }
}

async function analyzeTranscript(
  transcript: string,
  meetingTitle: string
): Promise<{
  summary: string
  actionItems: any[]
  keyDecisions: any[]
  topics: any[]
  duration?: number
}> {
  try {
    const prompt = `You are an AI assistant that analyzes meeting transcripts. Analyze the following meeting transcript and provide:

1. A concise executive summary (2-3 paragraphs)
2. Action items (extract tasks mentioned, identify who is responsible if mentioned, and when it's due if mentioned)
3. Key decisions made during the meeting
4. Main topics discussed

Meeting Title: ${meetingTitle}

Transcript:
${transcript}

Please respond in the following JSON format:
{
  "summary": "Executive summary here",
  "actionItems": [
    {"text": "Task description", "assignee": "Name or null", "dueDate": "Date or null"}
  ],
  "keyDecisions": [
    {"text": "Decision description"}
  ],
  "topics": [
    {"name": "Topic name", "description": "Brief description"}
  ],
  "duration": estimated duration in seconds (if mentioned in transcript, otherwise null)
}

Only return valid JSON, no additional text.`

    const completion = await retryOpenAICall(
      () => getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini", // Using mini for cost efficiency, can upgrade to gpt-4 if needed
        messages: [
          {
            role: "system",
            content:
              "You are a meeting analysis assistant. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      3, // 3 retries
      2000 // 2 second base delay
    )

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from OpenAI")
    }

    const analysis = JSON.parse(content)

    return {
      summary: analysis.summary || "No summary available",
      actionItems: analysis.actionItems || [],
      keyDecisions: analysis.keyDecisions || [],
      topics: analysis.topics || [],
      duration: analysis.duration || null,
    }
  } catch (error: any) {
    console.error("Analysis error:", error)
    
    // Handle OpenAI API errors
    if (error.status === 502 || error.status === 503) {
      throw new Error(
        "OpenAI service is temporarily unavailable. Please try again in a few minutes."
      )
    }
    
    if (error.status === 429) {
      throw new Error(
        "OpenAI API rate limit exceeded. Please try again in a few minutes."
      )
    }
    
    // Extract error message from HTML response if present
    let errorMessage = error.message || "Unknown error"
    if (errorMessage.includes("<!DOCTYPE html>") || errorMessage.includes("Bad gateway")) {
      errorMessage = "OpenAI service is temporarily unavailable. Please try again later."
    }
    
    throw new Error(`Analysis failed: ${errorMessage}`)
  }
}

