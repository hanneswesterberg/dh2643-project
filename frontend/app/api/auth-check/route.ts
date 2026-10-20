import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const cookie = request.headers.get('cookie') || '';
    
    // Use the updated environment variable name
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
        const djangoRes = await fetch(`${baseUrl}/api/users/me/`, {
            headers: { cookie }
        });

        if (djangoRes.status === 401) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        const data = await djangoRes.json();
        return NextResponse.json({ user: data }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
