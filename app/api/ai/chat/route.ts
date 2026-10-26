import { X509Certificate, verify as verifySignature } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const certs: { until: number; data: Record<string,string> } = { until: 0, data: {} };
const limits = new Map<string, { start: number; count: number }>();

async function verifyToken(token:string,project:string):Promise<string|null> {
  try {
    const parts=token.split(".");
    if(parts.length!==3||token.length>5000)return null;

    const head=JSON.parse(Buffer.from(parts[0],"base64url").toString()) as {alg?:string;kid?:string};
    const payload=JSON.parse(Buffer.from(parts[1],"base64url").toString()) as {
      aud?:string;iss?:string;sub?:string;iat?:number;exp?:number;auth_time?:number
    };

    const now=Date.now()/1000;
    if(head.alg!=="RS256"||!head.kid||payload.aud!==project||
      payload.iss!==`https://securetoken.google.com/${project}`||
      !payload.sub||payload.sub.length>128||
      !payload.exp||payload.exp<=now||
      !payload.iat||payload.iat>now||
      !payload.auth_time||payload.auth_time>now)return null;

    if(Date.now()>certs.until) {
      const res=await fetch(URL);
      if(!res.ok)return null;
      certs.data=await res.json() as Record<string,string>;
      certs.until=Date.now()+600000;
    }

    const pem=certs.data[head.kid];
    if(!pem)return null;

    return verifySignature(
      "RSA-SHA256",
      Buffer.from(parts[0]+"."+parts[1]),
      new X509Certificate(pem).publicKey,
      Buffer.from(parts[2],"base64url")
    )?payload.sub:null;
  }catch{return null;}
}

export async function POST(req:NextRequest) {
  const key=process.env.ANTHROPIC_API_KEY;
  const project=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if(!key||!project)
    return NextResponse.json(
      {error:"AI is not configured. Check ANTHROPIC_API_KEY in Vercel."},
      {status:503}
    );

  const bearer=req.headers.get("authorization")||"";
  const uid=bearer.startsWith("Bearer ")?await verifyToken(bearer.slice(7),project):null;

  if(!uid)
    return NextResponse.json({error:"Please sign in again."},{status:401});

  const time=Date.now(),last=limits.get(uid);
  if(last&&time-last.start<60000&&last.count>=10)
    return NextResponse.json(
      {error:"Too many messages. Try again in a minute."},
      {status:429}
    );

  limits.set(uid,last&&time-last.start<60000
    ? {start:last.start,count:last.count+1}
    : {start:time,count:1}
  );

  if(!req.headers.get("content-type")?.includes("application/json")||
     Number(req.headers.get("content-length")||0)>40000)
    return NextResponse.json({error:"Invalid request."},{status:400});

  let raw:unknown;
  try {raw=await req.json();}
  catch{return NextResponse.json({error:"Invalid request."},{status:400});}

  const input=raw&&typeof raw==="object"&&"messages" in raw
    ? (raw as {messages:unknown}).messages
    : null;

  if(!Array.isArray(input)||input.length<1||input.length>11)
    return NextResponse.json({error:"Start a new conversation."},{status:400});

  const messages:{role:"user"|"assistant";content:string}[]=[];

  for(const entry of input) {
    if(!entry||typeof entry!=="object")
      return NextResponse.json({error:"Invalid message."},{status:400});

    const m=entry as {role?:unknown;text?:unknown};

    if((m.role!=="user"&&m.role!=="assistant")||
      typeof m.text!=="string"||
      !m.text.trim()||
      m.text.length>3000||
      (messages.length>0&&messages[messages.length-1].role===m.role))
      return NextResponse.json({error:"Invalid message."},{status:400});

    messages.push({role:m.role,content:m.text.trim()});
  }

  if(messages[0].role!=="user"||
     messages[messages.length-1].role!=="user"||
     messages.reduce((n,m)=>n+m.content.length,0)>16000)
    return NextResponse.json({error:"Start a new conversation."},{status:400});

  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":key,
        "anthropic-version":"2023-06-01"
      },
      body:JSON.stringify({
        model:process.env.ANTHROPIC_MODEL||"claude-haiku-4-5-20251001",
        max_tokens:800,
        system:"You are Tranquiliva AI, a calm, warm and thoughtful companion for everyday wellbeing. Speak naturally and directly. Never invent a user's name or circumstances. You do not diagnose, prescribe, or replace therapy or emergency help. In crises, encourage local emergency services, someone trusted nearby, and findahelpline.com. Keep responses useful and avoid repetitive scripts.",
        messages
      }),
      signal:AbortSignal.timeout(25000),
      cache:"no-store"
    });

    if(!res.ok) {
      console.error("AI provider status:",res.status);
      return NextResponse.json(
        {error:"The AI provider could not respond. Check its API key, billing and model."},
        {status:502}
      );
    }

    const data=await res.json() as {content?:{type:string;text?:string}[]};
    const message=data.content?.filter(x=>x.type==="text").map(x=>x.text||"").join("\n").trim();

    if(!message)
      return NextResponse.json({error:"No response received."},{status:502});

    return NextResponse.json(
      {message},
      {headers:{"Cache-Control":"no-store"}}
    );
  }catch {
    return NextResponse.json(
      {error:"AI could not connect. Try again."},
      {status:502}
    );
  }
}
