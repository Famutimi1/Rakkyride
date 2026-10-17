import Link from "next/link";
import { adminRead, previewEnabled, requireStaff, InvalidStaffQuery } from "@/lib/server";
import { PageHeader, Panel, QueryState, Notice, DefinitionList, StatusBadge, Timestamp } from "@/components/primitives";
import { ConfirmAction } from "@/components/confirm-action";
import { EmailTemplatePreviewer } from "@/components/email-template-preview";
import { EmailPreferencesEditor } from "@/components/email-preferences";
import { DataTable } from "@/components/ui/data-table";
import { FilterForm, FormField } from "@/components/ui/filter-toolbar";
import { Button, LinkButton } from "@/components/ui/button";
import { statusLabel } from "@/lib/format";
import type { EmailList, EmailConfiguration, EmailTemplatePreview, EmailPreferences } from "@/contracts/admin";

const statuses=["waiting_email","waiting_admin","blocked","queued","sending","accepted","delivered","delayed","failed","bounced","complained","suppressed","uncertain","skipped"];
export default async function EmailsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const preview=previewEnabled();
  if(preview)return <><PageHeader eyebrow="SYSTEM" title="Email" description="Transactional email delivery, templates and configuration."/><QueryState title="Connect the email service" message="Delivery records and template previews load from the authorized backend. Development preview never sends operational email."/></>;
  const staff=await requireStaff();
  const search=await searchParams;
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(search)){
    if(!['page','status','template','audience','userId','from','to'].includes(key)||(value!==undefined&&typeof value!=='string'))throw new InvalidStaffQuery('Check the email filters.');
    if(typeof value==='string'&&value)query.set(key,value);
  }
  let data:EmailList;
  let configuration:EmailConfiguration;
  let templates:EmailTemplatePreview[];
  let preferences:EmailPreferences;
  try{[data,configuration,templates,preferences]=await Promise.all([adminRead<EmailList>(`emails?${query}`),adminRead<EmailConfiguration>('emails/configuration'),adminRead<EmailTemplatePreview[]>('emails/templates'),adminRead<EmailPreferences>('emails/preferences')]);}
  catch(error){if(error instanceof InvalidStaffQuery)return <QueryState title="Check the email filters" message="The date range, page or filter values were rejected."/>;throw error;}
  const pageHref=(page:number)=>{const next=new URLSearchParams(query);next.set('page',String(page));return `/admin/emails?${next}`;};
  const value=(key:string)=>typeof search[key]==='string'?search[key]:'';
  return <>
    <PageHeader eyebrow="SYSTEM" title="Email" description="Welcome messages, application decisions and account updates, with delivery history.">
      <LinkButton href="/admin/emails">Refresh</LinkButton>
      {staff.platformRole==='super_admin'&&<ConfirmAction title="Send administrative email test" label="Send test email" description="Queue one test per configured admin recipient. No customer receives this test. Limited to three tests per hour." path="emails/test" payload={{}} disabled={!preferences.enabled||!configuration.ready||!configuration.adminRecipients.length}/>}
    </PageHeader>
    {!configuration.ready&&<Notice>Delivery is paused until these backend settings are configured: {configuration.missing.join(', ')}. Account actions still save their email requests.</Notice>}
    {!configuration.webhookConfigured&&<Notice>Delivery tracking needs RESEND_WEBHOOK_SECRET and the Resend webhook endpoint. Accepted means the provider accepted a send request; delivered means the recipient’s mail server accepted the message.</Notice>}
    <Panel title="Email preferences" detail="Saved switches take effect across backend instances without a restart."><EmailPreferencesEditor key={preferences.version} settings={preferences} editable={staff.platformRole==='super_admin'}/></Panel>
    <Panel title="Delivery overview" detail="All saved emails. Counts include every recipient and all dates.">
      <DefinitionList items={[
        ['Waiting for an address',String((data.summary.waiting_email??0)+(data.summary.waiting_admin??0))],
        ['Blocked / queued / sending',String((data.summary.blocked??0)+(data.summary.queued??0)+(data.summary.sending??0))],
        ['Accepted / delayed',String((data.summary.accepted??0)+(data.summary.delayed??0))],
        ['Delivered',String(data.summary.delivered??0)],
        ['Failed / uncertain',String((data.summary.failed??0)+(data.summary.uncertain??0))],
        ['Bounced / complained / suppressed',String((data.summary.bounced??0)+(data.summary.complained??0)+(data.summary.suppressed??0))],
      ]}/>
    </Panel>
    <Panel title="Email history" detail={`${data.total.toLocaleString()} matching messages · updated ${new Date(data.asOf).toLocaleString('en-NG',{timeZone:'Africa/Lagos'})} WAT`}>
      <FilterForm action="/admin/emails">
        <FormField label="Status"><select name="status" defaultValue={value('status')}><option value="">All statuses</option>{statuses.map(status=><option key={status} value={status}>{statusLabel(status)}</option>)}</select></FormField>
        <FormField label="Template"><select name="template" defaultValue={value('template')}><option value="">All templates</option>{templates.map(template=><option key={template.template} value={template.template}>{statusLabel(template.template)}</option>)}</select></FormField>
        <FormField label="Audience"><select name="audience" defaultValue={value('audience')}><option value="">All recipients</option><option value="customer">Customer</option><option value="admin">Admin</option></select></FormField>
        <FormField label="Account UUID"><input name="userId" defaultValue={value('userId')} placeholder="Exact account UUID"/></FormField>
        <FormField label="From · WAT"><input type="date" name="from" defaultValue={value('from')}/></FormField>
        <FormField label="To · WAT (exclusive)"><input type="date" name="to" defaultValue={value('to')}/></FormField>
        <Button type="submit" variant="primary">Apply filters</Button><Link href="/admin/emails">Clear</Link>
      </FilterForm>
      <DataTable label="Email history" columns={[{id:'message',label:'Message'},{id:'recipient',label:'Recipient'},{id:'status',label:'Delivery'},{id:'attempts',label:'Attempts'},{id:'created',label:'Created'}]} rows={data.items.map(row=>({id:row.id,cells:[<><Link href={`/admin/emails/${row.id}`}>{row.subject}</Link><small>{statusLabel(row.template)}</small></>,<>{row.recipient}<small>{statusLabel(row.audience)}</small></>,<StatusBadge status={row.status}/>,row.attempts,<Timestamp value={row.createdAt}/>],actions:<Link href={`/admin/emails/${row.id}`}>Inspect</Link>}))} emptyTitle="No email records" emptyMessage="New account events will appear here. Change the filters to inspect other records."/>
      <div className="filter-bar"><span>Page {data.page} of {Math.max(1,Math.ceil(data.total/data.pageSize))}</span>{data.page>1&&<LinkButton href={pageHref(data.page-1)}>Previous</LinkButton>}{data.page*data.pageSize<data.total&&<LinkButton href={pageHref(data.page+1)}>Next</LinkButton>}</div>
    </Panel>
    <Panel title="Branded templates" detail="Canonical Rakky Ride logo, green actions and light surfaces. Both HTML and plain text are included."><EmailTemplatePreviewer templates={templates}/></Panel>
    <Panel title="Sending configuration" detail="Managed through backend environment variables. Credentials are never sent to this dashboard.">
      <DefinitionList items={[
        ['Sender',configuration.sender??'Not configured'],['Reply-to',configuration.replyTo??'Not configured'],['Admin recipients',configuration.adminRecipients.join(', ')||'Not configured'],
        ['Resend API key',configuration.apiKeyConfigured?'Configured':'Not configured'],['Webhook signing secret',configuration.webhookConfigured?'Configured':'Not configured'],
        ['Open app page',configuration.appUrl??'Set EMAIL_DASHBOARD_URL'],['Logo URL',configuration.logoUrl??'Not configured'],['Dashboard link',configuration.dashboardUrl??'Not configured'],
        ['Worker',<><StatusBadge status={configuration.worker.state}/><small>{configuration.worker.details}</small></>],
      ]}/>
    </Panel>
  </>;
}
