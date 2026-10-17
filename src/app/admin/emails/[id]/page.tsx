import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRead, previewEnabled } from "@/lib/server";
import { PageHeader, Panel, DefinitionList, StatusBadge, Timestamp, Notice } from "@/components/primitives";
import { ConfirmAction } from "@/components/confirm-action";
import type { EmailRecord } from "@/contracts/admin";

export default async function EmailDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(previewEnabled()||!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const row=await adminRead<EmailRecord&{text:string;html:string}>(`emails/${id}`);
  return <>
    <PageHeader eyebrow="EMAIL RECORD" title={row.subject} description="Stored content and delivery outcome for one recipient.">
      <Link href="/admin/emails">Back to email history</Link>
      <ConfirmAction title="Retry email delivery" label="Retry delivery" description="Retry this eligible failed request using the original content and provider idempotency key. Delivered, suppressed and uncertain messages cannot be retried." path={`emails/${id}/retry`} payload={{expectedVersion:row.version}} disabled={!row.canRetry}/>
    </PageHeader>
    {row.status==='uncertain'&&<Notice>The provider outcome is uncertain. Check Resend before taking action; this message will not be sent again automatically.</Notice>}
    <Panel title="Delivery details"><DefinitionList items={[
      ['Status',<StatusBadge status={row.status}/>],['Recipient',row.recipient],['Audience',row.audience],['Attempts',String(row.attempts)],['Last error',row.lastError??'None'],
      ['Created',<Timestamp value={row.createdAt}/>],['Accepted',row.acceptedAt?<Timestamp value={row.acceptedAt}/>: 'Not confirmed'],['Delivered',row.deliveredAt?<Timestamp value={row.deliveredAt}/>: 'Not confirmed'],
      ['Provider message ID',row.providerId??'Not assigned'],['Account',row.userId?<Link href={`/admin/riders/${row.userId}`}>{row.userId}</Link>:'No linked account'],
    ]}/></Panel>
    <Panel title="Email preview" detail="Links are disabled in this isolated preview."><div className="email-preview-shell"><iframe title="Stored email preview" sandbox="" srcDoc={row.html} className="email-preview-frame" referrerPolicy="no-referrer"/></div></Panel>
    <Panel title="Plain text"><pre className="email-text-preview panel-note">{row.text}</pre></Panel>
  </>;
}
