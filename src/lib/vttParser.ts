/**
 * WebVTT (.vtt) file parser
 *
 * Parses a VTT transcript into time-stamped segments, extracting
 * speaker labels if present (e.g. "<v Speaker Name>text</v>").
 */

import type { VTTSegment } from '@/types';

export interface ParsedVTT {
  segments: VTTSegment[];
  rawText:  string;
}

export function parseVTT(raw: string): ParsedVTT {
  const lines    = raw.replace(/\r\n/g, '\n').split('\n');
  const segments: VTTSegment[] = [];
  const rawLines: string[]     = [];

  let i = 0;

  // Skip WEBVTT header line
  if (lines[0]?.startsWith('WEBVTT')) i++;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect timestamp line: "00:00:00.000 --> 00:00:05.000"
    if (TIMESTAMP_RE.test(line)) {
      const match   = TIMESTAMP_RE.exec(line)!;
      const start   = match[1];
      const end     = match[2];
      const textLines: string[] = [];

      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      const fullText = textLines.join(' ');
      const { speaker, text } = extractSpeaker(fullText);

      if (text) {
        segments.push({ start, end, speaker, text });
        rawLines.push(`${speaker ? `[${speaker}] ` : ''}${text}`);
      }
    } else {
      i++;
    }
  }

  return { segments, rawText: rawLines.join('\n') };
}

const TIMESTAMP_RE = /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/;

/**
 * Extract speaker from VTT voice tags like: <v John Doe>Hello</v>
 * or "SPEAKER_00:" prefix style.
 */
function extractSpeaker(text: string): { speaker?: string; text: string } {
  // VTT voice tag: <v Speaker Name>text</v>
  const voiceMatch = /<v\s+([^>]+)>([\s\S]*?)<\/v>/.exec(text);
  if (voiceMatch) {
    return { speaker: voiceMatch[1].trim(), text: stripTags(voiceMatch[2]).trim() };
  }

  // "SPEAKER_00: text" pattern
  const colonMatch = /^([A-Z][A-Z0-9_ ]{1,30}):\s+(.+)$/.exec(text);
  if (colonMatch) {
    return { speaker: colonMatch[1].trim(), text: colonMatch[2].trim() };
  }

  return { text: stripTags(text).trim() };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/**
 * Parse plain-text transcripts (.txt / .srt).
 *
 * Handles common export formats:
 *  • "Speaker Name (HH:MM): text"        – Zoom / Teams chat export
 *  • "Speaker Name\nHH:MM:SS text"       – Teams transcript export
 *  • "HH:MM:SS,mmm --> HH:MM:SS,mmm\ntext"  – SRT format
 *  • "[Speaker]: text"                   – generic labelled transcript
 */
export function parsePlainTextTranscript(raw: string): ParsedVTT {
  const lines    = raw.replace(/\r\n/g, '\n').split('\n');
  const segments: VTTSegment[] = [];
  const rawLines: string[]     = [];

  // SRT: detect by presence of " --> " timestamp lines
  const isSRT = lines.some((l) => /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}/.test(l));
  if (isSRT) return parseSRT(raw);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // "Speaker (00:15): text"  or  "Speaker (00:01:23): text"
    const zoomMatch = /^(.+?)\s+\((\d{1,2}:\d{2}(?::\d{2})?)\):\s+(.+)$/.exec(line);
    if (zoomMatch) {
      const [, speaker, ts, text] = zoomMatch;
      segments.push({ start: ts, end: ts, speaker: speaker.trim(), text });
      rawLines.push(`[${speaker.trim()}] ${text}`);
      continue;
    }

    // "[Speaker]: text"  or  "Speaker: text"  (no time)
    const colonMatch = /^(?:\[([^\]]+)\]|([A-Za-z][^:]{1,40})):\s+(.{5,})$/.exec(line);
    if (colonMatch) {
      const speaker = (colonMatch[1] ?? colonMatch[2]).trim();
      const text    = colonMatch[3].trim();
      segments.push({ start: '00:00:00.000', end: '00:00:00.000', speaker, text });
      rawLines.push(`[${speaker}] ${text}`);
      continue;
    }

    // Bare line (no speaker attribution) – keep as Unknown
    if (line.length > 10) {
      segments.push({ start: '00:00:00.000', end: '00:00:00.000', text: line });
      rawLines.push(line);
    }
  }

  return { segments, rawText: rawLines.join('\n') };
}

/** Minimal SRT parser */
function parseSRT(raw: string): ParsedVTT {
  const blocks  = raw.split(/\n\n+/);
  const segments: VTTSegment[] = [];
  const rawLines: string[]     = [];
  const SRT_TS  = /(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/;

  for (const block of blocks) {
    const bLines = block.trim().split('\n');
    const tsLine = bLines.find((l) => SRT_TS.test(l));
    if (!tsLine) continue;
    const m = SRT_TS.exec(tsLine)!;
    const text = bLines
      .filter((l) => !SRT_TS.test(l) && !/^\d+$/.test(l.trim()))
      .join(' ')
      .trim();
    if (!text) continue;
    const { speaker, text: clean } = extractSpeaker(text);
    segments.push({ start: m[1], end: m[2], speaker, text: clean });
    rawLines.push(`${speaker ? `[${speaker}] ` : ''}${clean}`);
  }

  return { segments, rawText: rawLines.join('\n') };
}

/**
 * Converts parsed VTT/transcript segments into flat objects
 * the sentiment engine can process, filtering to only segments
 * from non-Zenoti speakers when a known team name list is provided.
 */
export function vttSegmentsToText(
  segments:        VTTSegment[],
  zenotiSpeakers?: Set<string>   // lower-cased names of Zenoti team members
): Array<{ authorName: string; content: string; createdAt: string }> {
  return segments
    .filter((s) => {
      if (s.text.length <= 10) return false;
      if (!zenotiSpeakers || zenotiSpeakers.size === 0) return true;
      // Exclude segments from known Zenoti team members
      if (!s.speaker) return true;
      const lc = s.speaker.toLowerCase();
      return !Array.from(zenotiSpeakers).some(
        (name) => lc.includes(name) || name.includes(lc)
      );
    })
    .map((s) => ({
      authorName: s.speaker ?? 'Unknown Speaker',
      content:    s.text,
      createdAt:  s.start,
    }));
}
