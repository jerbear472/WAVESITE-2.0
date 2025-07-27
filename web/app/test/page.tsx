export default function Test() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)', 
      padding: '2rem',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Test Page
      </h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
        This uses inline styles to test if React is rendering properly.
      </p>
      <div style={{ 
        background: 'white', 
        color: 'black', 
        padding: '1.5rem', 
        borderRadius: '0.5rem',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          If you see this styled content:
        </h2>
        <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem' }}>
          <li>React is working ✓</li>
          <li>Next.js is serving pages ✓</li>
          <li>The issue might be with Tailwind CSS loading</li>
        </ul>
      </div>
      
      <div className="mt-8 p-6 bg-green-500 rounded-lg text-white">
        <p className="text-xl font-bold">Tailwind Test</p>
        <p>If this box is GREEN with white text, Tailwind is working!</p>
      </div>
    </div>
  );
}