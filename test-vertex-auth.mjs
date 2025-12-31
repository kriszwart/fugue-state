import jwt from 'jsonwebtoken'
import fs from 'fs'

async function testVertexAuth() {
  try {
    // Read credentials from file
    const credentialsJson = fs.readFileSync('/tmp/gcp-key.json', 'utf8')
    const credentials = JSON.parse(credentialsJson)

    console.log('✓ Successfully parsed credentials')
    console.log('  Project ID:', credentials.project_id)
    console.log('  Client Email:', credentials.client_email)

    // Create JWT
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
    console.log('✓ Successfully created JWT')
    console.log('  JWT length:', signedJwt.length)

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt
      })
    })

    const responseText = await tokenResponse.text()

    if (!tokenResponse.ok) {
      console.error('✗ Token exchange failed')
      console.error('  Status:', tokenResponse.status, tokenResponse.statusText)
      console.error('  Response:', responseText)
      return
    }

    const tokenData = JSON.parse(responseText)
    console.log('✓ Successfully obtained access token')
    console.log('  Token type:', tokenData.token_type)
    console.log('  Expires in:', tokenData.expires_in, 'seconds')
    console.log('  Access token (first 50 chars):', tokenData.access_token.substring(0, 50) + '...')

    // Test Vertex AI API call
    const projectId = credentials.project_id
    const location = 'us-central1'
    const modelName = 'gemini-2.0-flash-exp'

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent`

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: 'Say hello in one word' }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50
        }
      })
    })

    const apiResponseText = await apiResponse.text()

    if (!apiResponse.ok) {
      console.error('✗ Vertex AI API call failed')
      console.error('  Status:', apiResponse.status, apiResponse.statusText)
      console.error('  Response:', apiResponseText)
      return
    }

    const apiData = JSON.parse(apiResponseText)
    const content = apiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No content'
    console.log('✓ Successfully called Vertex AI API')
    console.log('  Response:', content)

  } catch (error) {
    console.error('✗ Test failed with error:', error.message)
    console.error('  Stack:', error.stack)
  }
}

testVertexAuth()
