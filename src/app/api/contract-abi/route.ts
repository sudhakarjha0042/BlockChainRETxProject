import { NextResponse } from 'next/server';
import deploymentInfo from '../../../../backend/deploymentInfo.json';

export async function GET() {
  try {
    return NextResponse.json({ 
      abi: deploymentInfo.abi,
      address: deploymentInfo.address
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ABI' },
      { status: 500 }
    );
  }
}
