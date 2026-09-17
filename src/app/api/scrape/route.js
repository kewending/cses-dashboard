import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Add a generic user-agent to avoid basic blocks
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SecondBrainBot/1.0)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name) => {
      return (
        $(`meta[property="${name}"]`).attr('content') ||
        $(`meta[name="${name}"]`).attr('content') ||
        $(`meta[property="og:${name}"]`).attr('content') ||
        $(`meta[name="twitter:${name}"]`).attr('content')
      );
    };

    const title = getMetaTag('title') || $('title').text() || 'No Title';
    const description = getMetaTag('description') || 'No Description';
    const image = getMetaTag('image') || '';

    return NextResponse.json({
      title,
      description,
      image,
      url,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 });
  }
}
