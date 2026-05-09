# 🤝 Saathi — Your AI Companion, Always There

A NeoSapien-style AI second brain app that records conversations, analyzes them with Claude AI, and lets you query your memory.

## Features
- 🎙️ Real-time voice recording & transcription
- 🧠 AI-powered summaries, emotion tags & action items
- 🔍 Searchable memory bank
- 💬 Ask Saathi anything about past conversations
- 💾 Memories stored locally in your browser

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run the app
```bash
npm run dev
```

### 3. Open in browser
The app opens automatically at **http://localhost:3000**

### 4. Enter your Anthropic API Key
- Get a free key at [console.anthropic.com](https://console.anthropic.com)
- Paste it into the setup screen on first launch
- It's stored locally only — never shared

## Requirements
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Chrome or Edge browser (for microphone/speech support)
- Anthropic API key (free tier available)

## Tech Stack
- React 18 + Vite
- Web Speech API (transcription)
- Anthropic Claude API (AI analysis)
- localStorage (memory persistence)

## Build for production
```bash
npm run build
```
Output goes to the `dist/` folder — deploy anywhere (Vercel, Netlify, etc.)
