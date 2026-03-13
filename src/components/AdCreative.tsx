import React from 'react';

interface AdCreativeProps {
  ad: {
    title: string;
    description: string;
    image_url: string;
  };
  clickUrl: string;
}

/**
 * AdCreative component renders a safe HTML representation of an advertisement.
 * React's default behavior will escape all children (title, description), 
 * effectively preventing XSS attacks.
 */
export default function AdCreative({ ad, clickUrl }: AdCreativeProps) {
  return (
    <a 
      href={clickUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        textAlign: 'center', 
        fontFamily: 'sans-serif', 
        maxWidth: '300px', 
        cursor: 'pointer', 
        background: 'white' 
      }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{ad.title}</h4>
        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>{ad.description}</p>
        <img 
          src={ad.image_url} 
          style={{ width: '100%', borderRadius: '4px', background: '#eee', minHeight: '100px', objectFit: 'cover' }} 
          alt="Ad" 
        />
        <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>Sponsored by AdNetwork</div>
      </div>
    </a>
  );
}
