'use client'

import { useState } from 'react'

export function VideoBox({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        aspectRatio: '16/9',
        background: '#000',
        boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(212,160,23,.2), 0 0 80px rgba(212,160,23,.08)',
        cursor: 'pointer',
      }}
      onClick={() => setPlaying(true)}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg,rgba(11,26,46,.85),rgba(5,13,26,.7))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', color: '#fff',
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#D4A017,#F2C14E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(212,160,23,.5)',
            position: 'relative', zIndex: 2,
            animation: 'none',
          }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: '28px solid #0B1A2E',
              borderTop: '18px solid transparent',
              borderBottom: '18px solid transparent',
              marginLeft: '8px',
            }} />
          </div>
          <div style={{
            position: 'relative', zIndex: 2, marginTop: '28px',
            fontFamily: '"Playfair Display", serif',
            fontSize: '24px', fontStyle: 'italic', color: '#fff',
            maxWidth: '600px', textAlign: 'center', padding: '0 20px',
          }}>
            &ldquo;A empresa que você quer daqui a 3 anos começa na conversa que você evita ter hoje.&rdquo;
            <small style={{
              display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '12px',
              color: '#D4A017', fontStyle: 'normal', marginTop: '10px',
              letterSpacing: '.2em', textTransform: 'uppercase',
            }}>
              — Jovane Borlini · 4 min
            </small>
          </div>
        </div>
      )}
    </div>
  )
}
