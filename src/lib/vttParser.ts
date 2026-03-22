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
 * Converts parsed VTT segments into flat RLMessage-like objects
 * so the sentiment engine can process them alongside chat messages.
 */
export function vttSegmentsToText(segments: VTTSegment[]): Array<{
  authorName: string;
  content: string;
  createdAt: string;
}> {
  return segments
    .filter((s) => s.text.length > 10)
    .map((s) => ({
      authorName: s.speaker ?? 'Unknown Speaker',
      content:    s.text,
      createdAt:  s.start,  // use VTT timestamp as a relative marker
    }));
}
