// TikTok thumbnail scraper that fetches from the web page
// This is more reliable than direct CDN access

export class TikTokWebScraper {
  static async getThumbnail(url: string): Promise<string | null> {
    try {
      // Fetch the TikTok page HTML through our proxy
      const response = await fetch(`/api/scrape-tiktok`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        console.error('Failed to scrape TikTok page');
        return null;
      }
      
      const data = await response.json();
      return data.thumbnail;
    } catch (error) {
      console.error('TikTok scraping error:', error);
      return null;
    }
  }
  
  // Fallback method: Generate a placeholder thumbnail
  static getPlaceholderThumbnail(username: string): string {
    // Use a gradient placeholder with the username
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500'
    ];
    
    // Pick a color based on username hash
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colors.length;
    
    // Return a data URL for a gradient placeholder
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23${hash.toString(16).slice(0, 6)}'/%3E%3Cstop offset='100%25' style='stop-color:%23${hash.toString(16).slice(-6)}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='48' fill='white' text-anchor='middle' dy='.3em'%3E${username}%3C/text%3E%3C/svg%3E`;
  }
}