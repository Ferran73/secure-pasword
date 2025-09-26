# Secure Password Studio

A modern web app for generating strong, customizable passwords. Configure length, character sets, and advanced options, then copy the generated password straight into your password manager. The app ships with a lightweight Node.js server and a polished client experience.

## Features

- Adjustable length slider (4–128 characters)
- Toggle lowercase, uppercase, numeric, and symbol character sets
- Option to avoid visually similar characters for easier transcription
- Real-time strength meter with helpful guidance
- One-click copy support via the Clipboard API
- No external dependencies required

## Getting started

```bash
npm install  # optional, no external packages required
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000). The server exposes a `POST /api/password` endpoint that accepts JSON payloads matching the generator options.

## API

`POST /api/password`

Request body:

```json
{
  "length": 24,
  "includeLowercase": true,
  "includeUppercase": true,
  "includeNumbers": true,
  "includeSymbols": true,
  "excludeSimilar": false
}
```

Response:

```json
{
  "password": "nUEn6U!ktXJ+MhgkqSw5jF@C"
}
```

## Development notes

- The server is implemented with Node's built-in `http` module, so it works without network access or external packages.
- Passwords are generated using cryptographically secure random values from the Node.js `crypto` module.
- Static assets are served from the `public/` directory.
