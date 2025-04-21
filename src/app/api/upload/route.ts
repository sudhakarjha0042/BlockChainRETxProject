import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Helper function to stream file data (necessary for fetch with FormData)
async function streamToBuffer(readableStream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readableStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use Pinata JWT for authentication
    const pinataJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkZGRkYWJiNi0yZjExLTRmY2QtYmRkMy0wNzY3NWI5YWI2Y2MiLCJlbWFpbCI6InNhcnRoYWsuc2FtYmFyZS5zc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiODBhYmYyY2RhZDE2YTFiNjc3MjkiLCJzY29wZWRLZXlTZWNyZXQiOiIyNWY4N2UwMjA3ZDkxN2YzZGRlYjMyZGI1YjcyZTdiNDA4MDJhNDU3NGIyYWIyYTU2OWE5N2E5NWFhOTJmMjFkIiwiZXhwIjoxNzc1NDkwNDg5fQ.HyAhulxMeR2Hh0WRB_TlhDs2iOBXmmVZgrhm5p49A4A";
    if (!pinataJwt) {
      console.error("PINATA_JWT environment variable not set");
      return NextResponse.json({ error: 'Server configuration error: Missing Pinata JWT' }, { status: 500 });
    }

    console.log(`Uploading file "${file.name}" (${file.size} bytes) to Pinata...`);

    // Create FormData for Pinata API request
    const pinataFormData = new FormData();
    pinataFormData.append('file', file, file.name);

    // Add Pinata options if needed (e.g., wrapping with directory)
    // const pinataOptions = JSON.stringify({
    //   wrapWithDirectory: false, // Set to true if you want files wrapped in a directory
    // });
    // pinataFormData.append('pinataOptions', pinataOptions);

    // Add Pinata metadata if needed
    // const pinataMetadata = JSON.stringify({
    //   name: `Uploaded_${file.name}_${Date.now()}`, // Example metadata
    // });
    // pinataFormData.append('pinataMetadata', pinataMetadata);


    const pinataApiUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

    const response = await fetch(pinataApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
        // 'Content-Type': 'multipart/form-data' // fetch automatically sets this with FormData boundary
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinata API Error:', response.status, errorData);
      throw new Error(`Pinata API request failed: ${response.statusText} - ${errorData}`);
    }

    const result = await response.json();

    if (!result.IpfsHash) {
        console.error('Pinata API Error: No IpfsHash returned', result);
        throw new Error('Pinata API did not return an IPFS hash.');
    }

    // Construct the standard IPFS URL
    const ipfsUrl = `ipfs://${result.IpfsHash}`;
    console.log(`File uploaded successfully. IPFS URL: ${ipfsUrl}`);

    return NextResponse.json({ ipfsUrl: ipfsUrl }, { status: 200 });

  } catch (error: any) {
    console.error('IPFS Upload Error:', error);
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
