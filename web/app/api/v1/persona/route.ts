import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/v1/persona`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(null, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Persona API error:', error);
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const body = await request.json();

    // Transform frontend format to backend format
    const backendData = {
      location: {
        country: body.location?.country,
        city: body.location?.city,
        urban_type: body.location?.urbanType
      },
      demographics: {
        age_range: body.demographics?.ageRange,
        gender: body.demographics?.gender,
        education_level: body.demographics?.educationLevel,
        relationship_status: body.demographics?.relationshipStatus,
        has_children: body.demographics?.hasChildren
      },
      professional: {
        employment_status: body.professional?.employmentStatus,
        industry: body.professional?.industry,
        income_range: body.professional?.incomeRange,
        work_style: body.professional?.workStyle
      },
      interests: body.interests,
      lifestyle: {
        shopping_habits: body.lifestyle?.shoppingHabits,
        media_consumption: body.lifestyle?.mediaConsumption,
        values: body.lifestyle?.values
      },
      tech: {
        proficiency: body.tech?.proficiency,
        primary_devices: body.tech?.primaryDevices,
        social_platforms: body.tech?.socialPlatforms
      },
      is_complete: true
    };

    const response = await fetch(`${API_URL}/api/v1/persona`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    
    // Transform backend format to frontend format
    const frontendData = {
      location: {
        country: data.location?.country,
        city: data.location?.city,
        urbanType: data.location?.urban_type
      },
      demographics: {
        ageRange: data.demographics?.age_range,
        gender: data.demographics?.gender,
        educationLevel: data.demographics?.education_level,
        relationshipStatus: data.demographics?.relationship_status,
        hasChildren: data.demographics?.has_children
      },
      professional: {
        employmentStatus: data.professional?.employment_status,
        industry: data.professional?.industry,
        incomeRange: data.professional?.income_range,
        workStyle: data.professional?.work_style
      },
      interests: data.interests,
      lifestyle: {
        shoppingHabits: data.lifestyle?.shopping_habits,
        mediaConsumption: data.lifestyle?.media_consumption,
        values: data.lifestyle?.values
      },
      tech: {
        proficiency: data.tech?.proficiency,
        primaryDevices: data.tech?.primary_devices,
        socialPlatforms: data.tech?.social_platforms
      }
    };
    
    return NextResponse.json(frontendData);
  } catch (error) {
    console.error('Persona API error:', error);
    return NextResponse.json({ error: 'Failed to save persona' }, { status: 500 });
  }
}