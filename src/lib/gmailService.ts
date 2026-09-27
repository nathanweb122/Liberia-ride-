import { getAccessToken } from './googleSheets';

/**
 * Conforms an email into raw MIME RFC 2822 format and encodes it in base64url
 */
export const buildRawMessage = (to: string, subject: string, bodyText: string, bodyHtml?: string): string => {
  const boundary = 'liberia_ride_email_boundary_999';
  
  let mail = `To: ${to}\r\n`;
  mail += `Subject: ${subject}\r\n`;
  mail += `MIME-Version: 1.0\r\n`;
  mail += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  
  mail += `--${boundary}\r\n`;
  mail += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
  mail += `${bodyText}\r\n\r\n`;
  
  if (bodyHtml) {
    mail += `--${boundary}\r\n`;
    mail += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    mail += `${bodyHtml}\r\n\r\n`;
  }
  
  mail += `--${boundary}--`;

  // Base64url encode the UTF-8 MIME string
  const base64 = btoa(unescape(encodeURIComponent(mail)));
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  return base64url;
};

/**
 * Sends a message via Gmail REST API
 */
export const sendGmailMessage = async (to: string, subject: string, bodyText: string, bodyHtml?: string): Promise<any> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('You are not authenticated with Google. Please Sign In first.');
  }

  const rawMime = buildRawMessage(to, subject, bodyText, bodyHtml);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawMime
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Gmail send API error response:', errText);
    throw new Error(`Gmail Dispatch failed: ${res.statusText}`);
  }

  return await res.json();
};

/**
 * Lists the latest messages from the authenticated Gmail account
 */
export const listGmailMessages = async (query = '', maxResults = 10): Promise<any[]> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('You are not authenticated with Google. Please Sign In first.');
  }

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  if (query) {
    url.searchParams.append('q', query);
  }
  url.searchParams.append('maxResults', String(maxResults));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list Gmail messages: ${res.statusText}`);
  }

  const data = await res.json();
  return data.messages || [];
};

/**
 * Retrieves full details for a specific Gmail Message
 */
export const getGmailMessageDetails = async (messageId: string): Promise<any> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('You are not authenticated with Google. Please Sign In first.');
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch message details for ${messageId}`);
  }

  return await res.json();
};

/**
 * Helper to parse sender and subject from message metadata headers
 */
export const parseMessageHeaders = (msgDetails: any) => {
  const headers = msgDetails.payload?.headers || [];
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
  const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
  const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to');
  const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');

  return {
    id: msgDetails.id,
    snippet: msgDetails.snippet,
    subject: subjectHeader ? subjectHeader.value : '(No Subject)',
    from: fromHeader ? fromHeader.value : '(Unknown Sender)',
    to: toHeader ? toHeader.value : '(Unknown Recipient)',
    date: dateHeader ? dateHeader.value : '',
  };
};
