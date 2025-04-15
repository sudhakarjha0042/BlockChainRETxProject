import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the deployment info file
    const filePath = path.join(process.cwd(), 'backend', 'deploymentInfo.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Return the ABI and other contract info
    return NextResponse.json({
      address: data.address,
      abi: data.abi,
      initialVerificationFee: data.initialVerificationFee
    });
  } catch (error) {
    console.error('Error reading contract ABI:', error);
    return NextResponse.json(
      { error: 'Failed to load contract ABI' },
      { status: 500 }
    );
  }
}
