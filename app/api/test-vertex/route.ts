import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasCredentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      hasCredentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasProjectId: !!process.env.VERTEX_PROJECT_ID,
      hasLocation: !!process.env.VERTEX_LOCATION,
      projectId: process.env.VERTEX_PROJECT_ID,
      location: process.env.VERTEX_LOCATION,
      llmProvider: process.env.LLM_PROVIDER,
    },
    steps: []
  }

  try {
    // Step 1: Check if JSON credentials exist
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      diagnostics.steps.push({
        step: 1,
        status: 'FAILED',
        message: 'GOOGLE_APPLICATION_CREDENTIALS_JSON not found in environment'
      })
      return NextResponse.json(diagnostics, { status: 500 })
    }

    diagnostics.steps.push({
      step: 1,
      status: 'OK',
      message: 'GOOGLE_APPLICATION_CREDENTIALS_JSON found',
      jsonLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length
    })

    // Step 2: Parse credentials
    let credentials
    try {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      diagnostics.steps.push({
        step: 2,
        status: 'OK',
        message: 'Credentials parsed successfully',
        projectId: credentials.project_id,
        clientEmail: credentials.client_email
      })
    } catch (error: any) {
      diagnostics.steps.push({
        step: 2,
        status: 'FAILED',
        message: 'Failed to parse JSON credentials',
        error: error.message
      })
      return NextResponse.json(diagnostics, { status: 500 })
    }

    // Step 3: Create JWT
    try {
      const jwt = await import('jsonwebtoken')
      const now = Math.floor(Date.now() / 1000)
      const jwtPayload = {
        iss: credentials.client_email,
        sub: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      }

      const signedJwt = jwt.sign(jwtPayload, credentials.private_key, { algorithm: 'RS256' })

      diagnostics.steps.push({
        step: 3,
        status: 'OK',
        message: 'JWT created successfully',
        jwtLength: signedJwt.length
      })

      // Step 4: Exchange JWT for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: signedJwt
        })
      })

      const tokenText = await tokenResponse.text()

      if (!tokenResponse.ok) {
        diagnostics.steps.push({
          step: 4,
          status: 'FAILED',
          message: 'Token exchange failed',
          httpStatus: tokenResponse.status,
          response: tokenText
        })
        return NextResponse.json(diagnostics, { status: 500 })
      }

      const tokenData = JSON.parse(tokenText)
      diagnostics.steps.push({
        step: 4,
        status: 'OK',
        message: 'Access token obtained',
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      })

      // Step 5: Test Vertex AI API call
      const endpoint = `https://${process.env.VERTEX_LOCATION || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/${process.env.VERTEX_LOCATION || 'us-central1'}/publishers/google/models/gemini-2.0-flash-exp:generateContent`

      const vertexResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Reply with just OK' }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 10
          }
        })
      })

      const vertexText = await vertexResponse.text()

      if (!vertexResponse.ok) {
        diagnostics.steps.push({
          step: 5,
          status: 'FAILED',
          message: 'Vertex AI API call failed',
          httpStatus: vertexResponse.status,
          response: vertexText.substring(0, 500)
        })
        return NextResponse.json(diagnostics, { status: 500 })
      }

      const vertexData = JSON.parse(vertexText)
      const content = vertexData.candidates?.[0]?.content?.parts?.[0]?.text || 'No content'

      diagnostics.steps.push({
        step: 5,
        status: 'OK',
        message: 'Vertex AI working!',
        response: content
      })

      diagnostics.success = true
      return NextResponse.json(diagnostics)

    } catch (error: any) {
      diagnostics.steps.push({
        step: 3,
        status: 'FAILED',
        message: 'JWT creation or token exchange failed',
        error: error.message,
        stack: error.stack
      })
      return NextResponse.json(diagnostics, { status: 500 })
    }

  } catch (error: any) {
    diagnostics.error = {
      message: error.message,
      stack: error.stack
    }
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
