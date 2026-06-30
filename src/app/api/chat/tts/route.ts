import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { synthesizeSpeech } from '@/lib/deepgram-tts';
import { stripMarkdown } from '@/lib/markdown';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const { text, roleId } = await request.json();

    if (!text || !roleId) {
      return Response.json({ error: 'text and roleId required' }, { status: 400 });
    }

    // Get role to determine voice
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    });

    if (!role) {
      return Response.json({ error: 'role not found' }, { status: 404 });
    }

    // Get user's voice preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        professorVoice: true,
        tutorVoice: true,
        companionMVoice: true,
        companionFVoice: true
      }
    });

    // Determine voice ID
    let voiceId = 'aura-2-fabian-de'; // default
    if (user) {
      if (role.name === 'Professor' && user.professorVoice) {
        voiceId = user.professorVoice;
      } else if (role.name === 'Tutor' && user.tutorVoice) {
        voiceId = user.tutorVoice;
      } else if (role.name === 'Male Companion' && user.companionMVoice) {
        voiceId = user.companionMVoice;
      } else if (role.name === 'Female Companion' && user.companionFVoice) {
        voiceId = user.companionFVoice;
      }
    }

    // Strip markdown for clean speech
    const cleanText = stripMarkdown(text);

    // Truncate if too long
    const speakText = cleanText.length > 2000 ? cleanText.slice(0, 1997) + '...' : cleanText;

    // Generate audio
    const audioBuffer = await synthesizeSpeech(speakText, voiceId);
    const audioBase64 = audioBuffer.toString('base64');

    return Response.json({ audioBase64 });
  } catch (error) {
    console.error('TTS error:', error);
    return Response.json({ error: 'TTS failed' }, { status: 500 });
  }
}
